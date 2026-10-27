package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityException;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactInlineCopy;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;

/**
 * The hash-first transfer every runtime call of a model makes: the artifact's SHA-256 alone, and
 * the artifact only once the runtime answers that it does not hold it, streamed into the request
 * from the store (or the inline copy) and verified as it streams, never read whole first.
 */
class ModelRuntimeClientTest {

    private static final byte[] BYTES = "forest-artifact".getBytes();
    private static final String SHA256 = ArtifactHash.sha256(BYTES);
    private static final Map<String, String> FIELDS = Map.of("data", "{\"age\":52}");

    private final RestTemplate restTemplate = mock(RestTemplate.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final ModelArtifactInlineCopy inline = mock(ModelArtifactInlineCopy.class);
    private ModelRuntimeClient client;

    @BeforeEach
    void setUp() {
        client = new ModelRuntimeClient(new AnalyzerClient(restTemplate, restTemplate, "http://runtime"),
                new ModelArtifactContentReader(storage, inline));
    }

    @Test
    void aRunTheRuntimeCanServeSendsTheHashAloneAndReadsNoArtifact() {
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class)))
                .thenReturn(Map.of("reports", List.of()));

        assertEquals(Map.of("reports", List.of()), client.run("/predict", stored(SHA256), FIELDS));

        List<MultiValueMap<String, HttpEntity<?>>> sent = sent(1);
        assertEquals(SHA256, sent.get(0).getFirst("artifact_sha256").getBody());
        assertEquals("{\"age\":52}", sent.get(0).getFirst("data").getBody());
        assertNull(sent.get(0).getFirst("model_file"));
        verify(storage, never()).open(any(), any(), any());
        verify(inline, never()).open(any());
    }

    @Test
    void aRuntimeThatDoesNotHoldTheArtifactReceivesItStreamedUnderTheSameHash() throws IOException {
        when(storage.open("bucket", "key", "v1")).thenReturn(new ByteArrayInputStream(BYTES));
        when(restTemplate.postForObject(eq("http://runtime/explain"), any(), eq(Map.class)))
                .thenThrow(runtimeError(409, "Artifact is not loaded; send it with its SHA-256"))
                .thenReturn(Map.of("reports", List.of()));

        client.run("/explain", stored(SHA256), FIELDS);

        List<MultiValueMap<String, HttpEntity<?>>> sent = sent(2);
        assertNull(sent.get(0).getFirst("model_file"));
        HttpEntity<?> artifact = sent.get(1).getFirst("model_file");
        Resource body = assertInstanceOf(Resource.class, artifact.getBody());
        assertEquals(BYTES.length, body.contentLength());
        assertArrayEquals(BYTES, read(body));
        assertEquals("forest.mlbundle", artifact.getHeaders().getContentDisposition().getFilename());
        assertEquals(SHA256, sent.get(1).getFirst("artifact_sha256").getBody());
        assertEquals("{\"age\":52}", sent.get(1).getFirst("data").getBody());
    }

    @Test
    void anArtifactThatNoLongerMatchesItsIdentityFailsWhileItIsSent() {
        when(storage.open("bucket", "key", "v1")).thenReturn(new ByteArrayInputStream("tampered-bytes!".getBytes()));
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class)))
                .thenThrow(runtimeError(409, "Artifact is not loaded; send it with its SHA-256"))
                .thenReturn(Map.of());

        client.run("/predict", stored(SHA256), FIELDS);

        Resource body = (Resource) sent(2).get(1).getFirst("model_file").getBody();
        IOException failure = assertThrows(IOException.class, () -> read(body));
        assertInstanceOf(ArtifactIntegrityException.class, failure.getCause());
    }

    @Test
    void anInlineCopyIsStreamedWhenTheStoredObjectCannotBeOpened() throws IOException {
        when(storage.open("bucket", "key", "v1")).thenThrow(new ObjectStorageException("down"));
        when(inline.size(7L)).thenReturn((long) BYTES.length);
        when(inline.open(7L)).thenReturn(new ByteArrayInputStream(BYTES));
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class)))
                .thenThrow(runtimeError(409, "Artifact is not loaded; send it with its SHA-256"))
                .thenReturn(Map.of());

        client.run("/predict", stored(SHA256), FIELDS);

        assertArrayEquals(BYTES, read((Resource) sent(2).get(1).getFirst("model_file").getBody()));
    }

    @Test
    void anArtifactWithNeitherAStoredObjectNorAnInlineCopyIsNotSent() {
        when(storage.open("bucket", "key", "v1")).thenThrow(new ObjectStorageException("down"));
        when(inline.size(7L)).thenReturn(0L);
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class)))
                .thenThrow(runtimeError(409, "Artifact is not loaded; send it with its SHA-256"))
                .thenReturn(Map.of());

        client.run("/predict", stored(SHA256), FIELDS);

        Resource body = (Resource) sent(2).get(1).getFirst("model_file").getBody();
        assertThrows(ObjectStorageException.class, () -> read(body));
    }

    @Test
    void anyOtherRefusalOfTheRuntimeIsThrownWithoutSendingTheArtifact() {
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class)))
                .thenThrow(runtimeError(400, "Missing features: age"));

        AnalyzerServiceException refused = assertThrows(AnalyzerServiceException.class,
                () -> client.run("/predict", stored(SHA256), FIELDS));

        assertEquals(400, refused.getStatus());
        assertEquals("Missing features: age", refused.getDetail());
        sent(1);
        verify(storage, never()).open(any(), any(), any());
    }

    @Test
    void aModelStoredBeforeArtifactsWereHashedSendsItsBytesUnderTheirHash() throws IOException {
        when(inline.size(7L)).thenReturn((long) BYTES.length);
        when(inline.open(7L)).thenAnswer(call -> new ByteArrayInputStream(BYTES));
        when(restTemplate.postForObject(eq("http://runtime/predict"), any(), eq(Map.class))).thenReturn(Map.of());
        ModelArtifactReference legacy = new ModelArtifactReference(7L, "forest.mlbundle", null, null, null, null, null);

        client.run("/predict", legacy, FIELDS);

        MultiValueMap<String, HttpEntity<?>> only = sent(1).get(0);
        assertEquals(SHA256, only.getFirst("artifact_sha256").getBody());
        assertArrayEquals(BYTES, read((Resource) only.getFirst("model_file").getBody()));
    }

    private static byte[] read(Resource body) throws IOException {
        try (InputStream in = body.getInputStream()) {
            return in.readAllBytes();
        }
    }

    private static ModelArtifactReference stored(String sha256) {
        return new ModelArtifactReference(7L, "forest.mlbundle", "bucket", "key", "v1", (long) BYTES.length, sha256);
    }

    @SuppressWarnings("unchecked")
    private List<MultiValueMap<String, HttpEntity<?>>> sent(int calls) {
        ArgumentCaptor<HttpEntity<?>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(calls)).postForObject(any(String.class), captor.capture(), eq(Map.class));
        return captor.getAllValues().stream()
                .map(entity -> (MultiValueMap<String, HttpEntity<?>>) entity.getBody())
                .toList();
    }

    private static RestClientResponseException runtimeError(int status, String detail) {
        return new RestClientResponseException("runtime", status, "error", HttpHeaders.EMPTY,
                ("{\"detail\":\"" + detail + "\"}").getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }
}
