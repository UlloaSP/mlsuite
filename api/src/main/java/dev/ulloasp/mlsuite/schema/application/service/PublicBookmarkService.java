package dev.ulloasp.mlsuite.schema.application.service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionPlan.ModelCall;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkExampleStatus;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * The public surface of bookmarks. It never consults a session: visibility alone decides, and a
 * private, unknown, or archived bookmark is indistinguishable from one that does not exist.
 * Everything a public run needs from the database is read here, in one short transaction, so
 * the runtime is called afterwards with no connection held.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PublicBookmarkService implements PublicBookmarkUseCase {

    private static final Logger log = LoggerFactory.getLogger(PublicBookmarkService.class);
    /** Model features are numbers, flags, or short categories; nothing longer is a form value. */
    private static final int MAX_TEXT_LENGTH = 256;
    private static final int MAX_KEY_ECHO = 40;

    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaBookmarkExampleRepository exampleRepository;
    private final BookmarkPublishability publishability;

    @Override
    public PublicBookmarkDto getPublishedBookmark(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        SchemaVersion version = bookmark.getVersion();
        PublicForm form = PublicForm.of(version.getFormSchema(), publishability.models(version));
        return PublicBookmarkDto.from(bookmark, form.schema(), form.inputCount(), form.reportCount());
    }

    @Override
    public List<PublicBookmarkExampleDto> listPublishedExamples(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        return exampleRepository.findByBookmarkIdOrderByCreatedAtAscIdAsc(bookmark.getId()).stream()
                .filter(example -> example.status() == BookmarkExampleStatus.SERVED)
                .map(this::publicExample)
                .toList();
    }

    @Override
    public PageDto<PublicBookmarkSummaryDto> getPublishedBookmarkPage(int page, int size, String search, String sort) {
        Page<SchemaBookmark> bookmarks = bookmarkRepository.findPublishedPage(
                search == null ? "" : search.strip(),
                PageDto.request(page, size, sort(sort)));
        // A card counts what the bookmark's page shows, so it is read from the same public form.
        Map<Long, List<BoundModel>> models = publishability.models(
                bookmarks.getContent().stream().map(SchemaBookmark::getVersion).toList());
        return PageDto.of(bookmarks, bookmarks.getContent().stream().map(bookmark -> {
            SchemaVersion version = bookmark.getVersion();
            PublicForm form = PublicForm.of(version.getFormSchema(), models.getOrDefault(version.getId(), List.of()));
            return PublicBookmarkSummaryDto.from(bookmark, form.inputCount(), form.reportCount());
        }).toList());
    }

    /** Answers 404 unless the bookmark is public now, as every public read of it does. */
    public void requirePublic(String publicId) {
        requirePublished(publicId);
    }

    /** Checks a public run against the bookmark as it is now and routes its values to each model. */
    public PublicPredictionPlan planPrediction(String publicId, PublicPredictionRequest request) {
        SchemaVersion version = requirePublished(publicId).getVersion();
        if (version.getVersion() != request.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This bookmark changed after the page was loaded. Reload the page and run it again.");
        }
        List<BoundModel> models = publishability.models(version);
        Optional<String> refusal = publishability.refusal(models);
        if (refusal.isPresent()) {
            log.warn("Public bookmark {} was not run: {}", publicId, refusal.get());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This bookmark cannot be run publicly.");
        }
        PublicForm form = PublicForm.of(version.getFormSchema(), models);
        requireFormValues(form, request.values());
        return new PublicPredictionPlan(publicId,
                models.stream()
                        .map(model -> new ModelCall(model.id(), form.modelInput(model, request.values())))
                        .toList(),
                form.reportRoutes());
    }

    private PublicBookmarkExampleDto publicExample(SchemaBookmarkExample example) {
        return new PublicBookmarkExampleDto(
                example.getPublicId(),
                example.getRun().getName(),
                PublicExampleInputs.of(example.getBookmark().getVersion().getFormSchema(),
                        example.getRun().getInputData()));
    }

    private SchemaBookmark requirePublished(String publicId) {
        return bookmarkRepository.findPublishedByPublicId(publicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public bookmark not found"));
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"));
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }

    /** Only the form's own inputs, each a scalar: the form bounds how many values a run carries. */
    private static void requireFormValues(PublicForm form, Map<String, Object> values) {
        values.forEach((key, value) -> {
            if (!form.inputKeys().contains(key)) {
                throw badRequest("The form has no input \"%s\".".formatted(
                        key.length() <= MAX_KEY_ECHO ? key : key.substring(0, MAX_KEY_ECHO)));
            }
            if (!isFormValue(value)) {
                throw badRequest("Input \"%s\" has a value the form cannot send.".formatted(key));
            }
        });
    }

    private static boolean isFormValue(Object value) {
        if (value == null || value instanceof Boolean) return true;
        if (value instanceof String text) return text.length() <= MAX_TEXT_LENGTH;
        if (value instanceof BigInteger || value instanceof BigDecimal) return false;
        return value instanceof Number number && Double.isFinite(number.doubleValue());
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
