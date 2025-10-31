package dev.ulloasp.mlsuite;

import java.security.cert.X509Certificate;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class MlsuiteApplication {

    public static void main(String[] args) {
        // Configurar JVM para aceptar certificados self-signed (solo desarrollo)
        configureTrustAllCertificates();

        SpringApplication.run(MlsuiteApplication.class, args);
    }

    /**
     * Configura JVM para confiar en todos los certificados SSL (solo desarrollo)
     * IMPORTANTE: Solo usar en desarrollo. Nunca en producción.
     * Necesario porque py-analyzer usa certificados auto-firmados en HTTPS.
     */
    private static void configureTrustAllCertificates() {
        try {
            // Crear un TrustManager que acepta todos los certificados
            TrustManager[] trustAllCerts = new TrustManager[] {
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        }
                    }
            };

            // Crear un SSLContext con el TrustManager personalizado
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());

            // Configurar como default para todas las conexiones HTTPS
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());

            // Desabilitar verificación de hostname (solo desarrollo)
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
        } catch (Exception e) {
            System.err.println("Error configurando SSL para certificados self-signed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Configura RestTemplate para comunicación con servicios HTTPS
     */
    @Bean
    RestTemplate restTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);

        RestTemplate rt = builder
                .requestFactory(() -> new BufferingClientHttpRequestFactory(requestFactory))
                .build();

        rt.getInterceptors().add((req, body, ex) -> {
            return ex.execute(req, body);
        });

        return rt;
    }
}
