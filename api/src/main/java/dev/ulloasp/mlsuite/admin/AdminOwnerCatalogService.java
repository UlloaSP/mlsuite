package dev.ulloasp.mlsuite.admin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The enabled users a superadmin may make the owner of an organization, searched by name or e-mail. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdminOwnerCatalogService {

    private final UserRepository users;

    public PageDto<AdminUserDto> list(CatalogRequest request) {
        String search = CatalogPages.likeLiteral(request.search());
        Specification<User> enabledAndMatching = (root, query, builder) -> builder.and(
                builder.isTrue(root.get("enabled")),
                builder.or(
                        builder.like(builder.lower(root.get("fullName")), search, '!'),
                        builder.like(builder.lower(root.get("email")), search, '!')));
        Page<User> page = users.findAll(enabledAndMatching,
                CatalogPages.pageable(request, Sort.by("fullName", "id")));
        return PageDto.of(page, page.getContent().stream().map(AdminUserDto::from).toList());
    }
}
