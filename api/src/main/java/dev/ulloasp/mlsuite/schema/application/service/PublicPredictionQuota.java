package dev.ulloasp.mlsuite.schema.application.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.schema.domain.exception.PublicRunLimitException;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;

/**
 * How many times one caller may run one public bookmark: a limit per bookmark for each network
 * without a session and a higher one for each account, over the 24 hours that follow the first
 * run counted for that caller.
 *
 * <p>The counts live in this process's memory and nowhere else. They start again when the API
 * restarts, and they are right only while a single API instance serves the public surface: each
 * further instance would allow the full limit on its own.
 */
@Component
public class PublicPredictionQuota {

    static final Duration WINDOW = Duration.ofHours(24);
    /**
     * The most windows kept, a few hundred bytes each. Past it the oldest is forgotten, which
     * gives its caller their runs back early: whoever holds that many addresses already had that
     * many limits, and the memory an address cycler can take stays bounded.
     */
    static final int MAX_WINDOWS = 50_000;

    private final int anonymousLimit;
    private final int signedInLimit;
    private final int maxWindows;
    private final Clock clock;
    /** Oldest first: every window lasts the same, so the order of insertion is the order of expiry. */
    private final LinkedHashMap<Key, Window> windows = new LinkedHashMap<>();

    @Autowired
    public PublicPredictionQuota(
            @Value("${mlsuite.public-prediction.anonymous-runs-per-day}") int anonymousLimit,
            @Value("${mlsuite.public-prediction.signed-in-runs-per-day}") int signedInLimit) {
        this(anonymousLimit, signedInLimit, MAX_WINDOWS, Clock.systemUTC());
    }

    public PublicPredictionQuota(int anonymousLimit, int signedInLimit, int maxWindows, Clock clock) {
        if (anonymousLimit < 1 || signedInLimit < 1) {
            throw new IllegalArgumentException("PUBLIC_PREDICTION_ANONYMOUS_RUNS_PER_DAY and "
                    + "PUBLIC_PREDICTION_SIGNED_IN_RUNS_PER_DAY must be at least 1.");
        }
        this.anonymousLimit = anonymousLimit;
        this.signedInLimit = signedInLimit;
        this.maxWindows = maxWindows;
        this.clock = clock;
    }

    /** What the caller may still run on the bookmark. Asking counts nothing and keeps nothing. */
    public synchronized PublicRunQuotaDto status(PublicCaller caller, String publicId) {
        int limit = limit(caller);
        Window window = current(new Key(caller.key(), publicId), clock.instant());
        return window == null
                ? new PublicRunQuotaDto(limit, limit, null)
                : new PublicRunQuotaDto(limit, limit - window.runs, window.resetsAt);
    }

    /** Counts one run for the caller, or refuses it when the bookmark's limit is already used. */
    public synchronized void admit(PublicCaller caller, String publicId) {
        Instant now = clock.instant();
        Key key = new Key(caller.key(), publicId);
        int limit = limit(caller);
        Window window = current(key, now);
        if (window != null && window.runs >= limit) {
            throw new PublicRunLimitException(caller.signedIn(), limit, window.resetsAt,
                    Duration.between(now, window.resetsAt));
        }
        if (window == null) {
            window = open(key, now);
        }
        window.runs++;
    }

    /** Returns the run {@link #admit} counted, when the server then could not perform it. */
    public synchronized void giveBack(PublicCaller caller, String publicId) {
        Key key = new Key(caller.key(), publicId);
        Window window = windows.get(key);
        if (window != null && --window.runs <= 0) {
            windows.remove(key);
        }
    }

    private int limit(PublicCaller caller) {
        return caller.signedIn() ? signedInLimit : anonymousLimit;
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
            if (!expired && windows.size() < maxWindows) {
                break;
            }
            oldest.remove();
        }
        Window window = new Window(now.plus(WINDOW));
        windows.put(key, window);
        return window;
    }

    private record Key(String caller, String publicId) {
    }

    private static final class Window {
        private final Instant resetsAt;
        private int runs;

        private Window(Instant resetsAt) {
            this.resetsAt = resetsAt;
        }
    }
}
