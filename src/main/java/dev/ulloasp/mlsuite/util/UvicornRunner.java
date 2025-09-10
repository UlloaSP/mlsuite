package dev.ulloasp.mlsuite.util;

import java.io.File;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UvicornRunner {
    private static final Logger log = LoggerFactory.getLogger(UvicornRunner.class);
    private Process uvicorn;

    @Bean
    ApplicationRunner startUvicorn(
            @Value("${uvicorn.enabled:true}") boolean enabled) {
        return args -> {
            if (!enabled) {
                log.info("Uvicorn disabled. Skipping.");
                return;
            }

            ProcessBuilder pb = isWindows()
                    ? new ProcessBuilder("cmd", "/c", "cd", "/d", "./backend", "&&",
                            "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000")
                    : new ProcessBuilder("bash", "-lc",
                            "cd ./backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000");

            pb.directory(new File(".")); // project root
            pb.redirectErrorStream(true); // merge stderr into stdout
            uvicorn = pb.start();

            // Forward logs in a lightweight thread
            Thread t = new Thread(() -> {
                try (var br = new java.io.BufferedReader(new java.io.InputStreamReader(uvicorn.getInputStream()))) {
                    String line;
                    while ((line = br.readLine()) != null)
                        log.info("[uvicorn] {}", line);
                } catch (Exception ignore) {
                }
            }, "uvicorn-logger");
            t.setDaemon(true);
            t.start();

            // Kill child when Spring stops
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    if (uvicorn != null && uvicorn.isAlive()) {
                        log.info("Stopping Uvicorn…");
                        uvicorn.destroy();
                        if (!uvicorn.waitFor(3, java.util.concurrent.TimeUnit.SECONDS)) {
                            uvicorn.destroyForcibly();
                        }
                    }
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }, "uvicorn-shutdown"));
        };
    }

    private static boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }
}
