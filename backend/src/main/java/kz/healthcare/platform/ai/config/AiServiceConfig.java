package kz.healthcare.platform.ai.config;

import kz.healthcare.platform.ai.application.AiServiceProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(AiServiceProperties.class)
public class AiServiceConfig {

    @Bean
    public RestClient aiServiceRestClient(AiServiceProperties props) {
        var factory = new SimpleClientHttpRequestFactory();
        int timeoutMs = (int) props.timeout().toMillis();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);

        return RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("x-service-token", props.internalToken())
                .requestFactory(factory)
                .build();
    }
}
