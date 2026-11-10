package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

class PageDtoTest {

    @Test
    void request_KeepsAPageAndSizeInRange() {
        PageRequest request = PageDto.request(3, 100, Sort.by("id"));

        assertEquals(3, request.getPageNumber());
        assertEquals(100, request.getPageSize());
        assertEquals(1, PageDto.size(1));
        assertEquals(0, PageDto.page(0));
    }

    @Test
    void request_RefusesANegativePage() {
        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> PageDto.request(-1, 24, Sort.unsorted()));

        assertEquals("Invalid page '-1'; expected 0 or more", refused.getMessage());
    }

    @Test
    void request_RefusesASizeOutOfRange() {
        assertEquals("Invalid size '0'; expected 1 to 100", assertThrows(IllegalArgumentException.class,
                () -> PageDto.request(0, 0, Sort.unsorted())).getMessage());
        assertEquals("Invalid size '101'; expected 1 to 100", assertThrows(IllegalArgumentException.class,
                () -> PageDto.size(101)).getMessage());
    }

    @Test
    void of_CopiesPageMetadata() {
        var page = new PageImpl<>(List.of("a", "b"), PageRequest.of(1, 2), 5);

        PageDto<String> dto = PageDto.of(page, List.of("A", "B"));

        assertEquals(new PageDto<>(List.of("A", "B"), 1, 2, 5, true), dto);
    }
}
