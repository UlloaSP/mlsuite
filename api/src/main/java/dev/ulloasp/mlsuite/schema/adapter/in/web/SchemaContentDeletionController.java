package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.port.in.SchemaContentDeletionUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SchemaContentDeletionController {

    private final SchemaContentDeletionUseCase deletion;

    @DeleteMapping("/schema-drafts/{draftId}")
    public ResponseEntity<Void> deleteDraft(CurrentUser user, @PathVariable Long draftId) {
        deletion.deleteDraft(user.userId(), draftId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/schema-bookmarks/{bookmarkId}")
    public ResponseEntity<Void> deleteBookmark(CurrentUser user, @PathVariable Long bookmarkId) {
        deletion.deleteBookmark(user.userId(), bookmarkId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/schema-versions/{versionId}")
    public ResponseEntity<Void> deleteVersion(CurrentUser user, @PathVariable Long versionId) {
        deletion.deleteVersion(user.userId(), versionId);
        return ResponseEntity.noContent().build();
    }
}
