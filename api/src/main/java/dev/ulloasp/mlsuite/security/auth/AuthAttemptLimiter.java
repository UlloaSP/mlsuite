package dev.ulloasp.mlsuite.security.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Slows password guessing and mass registration from one network: it may fail to sign in, and
 * attempt to register, a limited number of times in the 15 minutes that follow the first attempt
 * counted. Past the limit it waits for the window to end, even with the right password. A
 * successful sign-in does not reset the failures, so one valid account cannot be used to keep
 * guessing others.
 *
 * <p>Like the public run quota, the counts live in this process's memory: they start again when the
 * API restarts, and they hold only with a single API instance.
 */
@Component
public class AuthAttemptLimiter {

    static final Duration WINDOW = Duration.ofMinutes(15);
    /** The most windows kept; past it the oldest is forgotten, so memory stays bounded. */
    static final int MAX_WINDOWS = 50_000;

    private final int maxLoginFailures;
    private final int maxRegistrations;
    private final Clock clock;
    /** Oldest first: every window lasts the same, so the order of insertion is the order of expiry. */
    private final LinkedHashMap<Key, Window> windows = new LinkedHashMap<>();

    @Autowired
    public AuthAttemptLimiter(
            @Value("${mlsuite.auth.max-login-failures}") int maxLoginFailures,
            @Value("${mlsuite.auth.max-registrations}") int maxRegistrations) {
        this(maxLoginFailures, maxRegistrations, Clock.systemUTC());
    }

    public AuthAttemptLimiter(int maxLoginFailures, int maxRegistrations, Clock clock) {
        if (maxLoginFailures < 1 || maxRegistrations < 1) {
            throw new IllegalArgumentException("AUTH_MAX_LOGIN_FAILURES and AUTH_MAX_REGISTRATIONS must be at least 1.");
        }
        this.maxLoginFailures = maxLoginFailures;
        this.maxRegistrations = maxRegistrations;
        this.clock = clock;
    }

    /** Refuses a sign-in from a network that has used up its failures. */
    public synchronized void checkLogin(String caller) {
        refuseWhenSpent(new Key(Attempt.LOGIN, caller), maxLoginFailures, clock.instant());
    }

    public synchronized void recordLoginFailure(String caller) {
        count(new Key(Attempt.LOGIN, caller), clock.instant());
    }

    /** Counts one registration attempt, or refuses it when the network has used them up. */
    public synchronized void admitRegistration(String caller) {
        Instant now = clock.instant();
        Key key = new Key(Attempt.REGISTRATION, caller);
        refuseWhenSpent(key, maxRegistrations, now);
        count(key, now);
    }

    private void refuseWhenSpent(Key key, int limit, Instant now) {
        Window window = current(key, now);
        if (window != null && window.attempts >= limit) {
            throw new AuthAttemptLimitException(key.attempt() == Attempt.LOGIN,
                    Duration.between(now, window.resetsAt));
        }
    }

    private void count(Key key, Instant now) {
        Window window = current(key, now);
        (window == null ? open(key, now) : window).attempts++;
    }

    private Window current(Key key, Instant now) {
        Window window = windows.get(key);
        if (window != null && !now.isBefore(window.resetsAt)) {
            windows.remove(key);
            return null;
        }
        return window;
    }

    /** Starts the caller's window, first dropping every expired one and, when full, the oldest. */
    private Window open(Key key, Instant now) {
        Iterator<Window> oldest = windows.values().iterator();
        while (oldest.hasNext()) {
            boolean expired = !now.isBefore(oldest.next().resetsAt);
            if (!expired && windows.size() < MAX_WINDOWS) {
                break;
            }
            oldest.remove();
        }
        Window window = new Window(now.plus(WINDOW));
        windows.put(key, window);
        return window;
    }

    private enum Attempt {
        LOGIN, REGISTRATION
    }

    private record Key(Attempt attempt, String caller) {
    }

    private static final class Window {
        private final Instant resetsAt;
        private int attempts;

        private Window(Instant resetsAt) {
            this.resetsAt = resetsAt;
        }
    }
}
