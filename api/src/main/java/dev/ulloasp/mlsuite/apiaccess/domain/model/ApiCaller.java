package dev.ulloasp.mlsuite.apiaccess.domain.model;

/**
 * Who is calling, read from the key before anything else: the key, its client and the
 * client's organization, as they were when the call was accepted. {@code monthlyCallLimit} is
 * the organization's own limit, null when it follows the instance default.
 */
public record ApiCaller(
        Long keyId,
        String keyPrefix,
        Long clientId,
        String clientName,
        Long organizationId,
        Integer monthlyCallLimit,
        boolean suspended) {

    public static ApiCaller of(ApiClientKey key) {
        ApiClient client = key.getClient();
        return new ApiCaller(key.getId(), key.getKeyPrefix(), client.getId(), client.getName(),
                client.getOrganization().getId(), client.getOrganization().getApiMonthlyCallLimit(),
                client.isSuspended());
    }
}
