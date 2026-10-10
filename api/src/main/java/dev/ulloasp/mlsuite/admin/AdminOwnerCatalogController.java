package dev.ulloasp.mlsuite.admin;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users/owner-candidates")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class AdminOwnerCatalogController {

    private final AdminOwnerCatalogService owners;

    @GetMapping("/catalog")
    public PageDto<AdminUserDto> ownerCandidateUserCatalog(@ModelAttribute CatalogRequest request) {
        return owners.list(request);
    }
}
