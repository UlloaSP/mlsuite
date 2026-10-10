package dev.ulloasp.mlsuite.util;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Paging and search shared by the server-owned catalogs. */
public final class CatalogPages {

    private CatalogPages() {
    }

    /** One page of a small, bounded list that is filtered and ordered in memory. */
    public static <T> PageDto<T> of(List<T> items, CatalogRequest request,
            Predicate<T> matches, Comparator<T> order) {
        return page(items.stream().filter(matches).sorted(order).toList(), request);
    }

    public static <T> PageDto<T> page(List<T> items, CatalogRequest request) {
        int from = (int) Math.min((long) request.page() * request.size(), items.size());
        int to = Math.min(from + request.size(), items.size());
        return new PageDto<>(items.subList(from, to), request.page(), request.size(), items.size(),
                to < items.size());
    }

    /** The page a database query reads; {@code sort} needs a unique last property. */
    public static Pageable pageable(CatalogRequest request, Sort sort) {
        return PageDto.request(request.page(), request.size(), sort);
    }

    public static boolean contains(String search, Object... values) {
        StringBuilder text = new StringBuilder();
        for (Object value : values) {
            if (value != null) {
                text.append(value).append(' ');
            }
        }
        return text.toString().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT));
    }

    /** A lower-case LIKE pattern that matches {@code search} literally, for {@code ESCAPE '!'}. */
    public static String likeLiteral(String search) {
        String escaped = search.toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        return "%" + escaped + "%";
    }
}
