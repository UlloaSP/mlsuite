package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

class PageDtoTest {

    @Test
    void clampSize_DefaultsNonPositiveSizesAndCapsLargeOnes() {
        assertEquals(24, PageDto.clampSize(0));
        assertEquals(24, PageDto.clampSize(-3));
        assertEquals(10, PageDto.clampSize(10));
        assertEquals(100, PageDto.clampSize(500));
    }

    @Test
    void request_ClampsPageAndSize() {
        PageRequest request = PageDto.request(-1, 0, Sort.unsorted());

        assertEquals(0, request.getPageNumber());
        assertEquals(24, request.getPageSize());
    }

    @Test
    void of_CopiesPageMetadata() {
        var page = new PageImpl<>(List.of("a", "b"), PageRequest.of(1, 2), 5);

        PageDto<String> dto = PageDto.of(page, List.of("A", "B"));

        assertEquals(new PageDto<>(List.of("A", "B"), 1, 2, 5, true), dto);
    }
}
