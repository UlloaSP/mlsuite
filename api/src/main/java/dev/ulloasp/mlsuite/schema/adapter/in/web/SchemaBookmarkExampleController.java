package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schema-bookmarks/{bookmarkId}/examples")
@RequiredArgsConstructor
public class SchemaBookmarkExampleController {

    private final SchemaBookmarkExampleUseCase examples;

    @GetMapping
    public ResponseEntity<List<SchemaBookmarkExampleDto>> list(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(examples.listExamples(user.userId(), bookmarkId));
    }

    @PutMapping("/{runId}")
    public ResponseEntity<SchemaBookmarkExampleDto> mark(CurrentUser user, @PathVariable Long bookmarkId,
            @PathVariable Long runId) {
        return ResponseEntity.ok(examples.markExample(user.userId(), bookmarkId, runId));
    }

    @DeleteMapping("/{runId}")
    public ResponseEntity<Void> unmark(CurrentUser user, @PathVariable Long bookmarkId, @PathVariable Long runId) {
        examples.unmarkExample(user.userId(), bookmarkId, runId);
        return ResponseEntity.noContent().build();
    }
}
