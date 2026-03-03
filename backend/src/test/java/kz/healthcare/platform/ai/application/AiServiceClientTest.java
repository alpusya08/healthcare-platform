package kz.healthcare.platform.ai.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiServiceClientTest {

    @Mock private RestClient restClient;
    @Mock private RestClient.RequestHeadersUriSpec<?> headersUriSpec;
    @Mock private RestClient.RequestHeadersSpec<?> headersSpec;
    @Mock private RestClient.ResponseSpec headersResponseSpec;

    private AiServiceClient aiServiceClient;

    @BeforeEach
    @SuppressWarnings({"unchecked", "rawtypes"})
    void setUp() {
        aiServiceClient = new AiServiceClient(restClient);

        doReturn(headersUriSpec).when(restClient).get();
        doReturn(headersSpec).when(headersUriSpec).uri(anyString());
        doReturn(headersResponseSpec).when(headersSpec).retrieve();
    }

    @Test
    void isHealthy_service2xx_returnsTrue() {
        when(headersResponseSpec.toBodilessEntity()).thenReturn(ResponseEntity.ok().build());
        assertThat(aiServiceClient.isHealthy()).isTrue();
    }

    @Test
    void isHealthy_connectionRefused_returnsFalse() {
        when(headersResponseSpec.toBodilessEntity()).thenThrow(new RestClientException("Connection refused"));
        assertThat(aiServiceClient.isHealthy()).isFalse();
    }

    @Test
    void isHealthy_serverError_returnsFalse() {
        when(headersResponseSpec.toBodilessEntity()).thenThrow(new RestClientException("500 Internal Server Error"));
        assertThat(aiServiceClient.isHealthy()).isFalse();
    }
}
