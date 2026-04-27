package dev.ulloasp.mlsuite.organization.entities;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class OrganizationUserId implements Serializable {

    private Long organization;
    private Long user;
}
