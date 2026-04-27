package dev.ulloasp.mlsuite.security.identity;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@Component
public class CurrentUserResolver {

    private final OAuth2ExternalIdentityExtractor externalIdentityExtractor;
    private final UserLookupService userLookupService;

    public CurrentUserResolver(
            OAuth2ExternalIdentityExtractor externalIdentityExtractor,
            UserLookupService userLookupService) {
        this.externalIdentityExtractor = externalIdentityExtractor;
        this.userLookupService = userLookupService;
    }

    public CurrentUser resolve(OAuth2AuthenticationToken authentication) {
        User user = userLookupService.requireByExternalIdentity(externalIdentityExtractor.extract(authentication));
        return new CurrentUser(user.getId(), user.getUsername());
    }
}
