package dev.ulloasp.mlsuite.admin.alert;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AlertSettings.class)
class AlertConfig {
}
