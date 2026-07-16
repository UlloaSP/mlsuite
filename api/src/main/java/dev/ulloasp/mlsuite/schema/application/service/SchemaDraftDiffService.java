package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftChangeDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeSide;

@Service
public class SchemaDraftDiffService {
    private static final ObjectMapper CANONICAL_JSON = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    public SchemaDraftDiffDto diff(Long baseVersionId, Long currentVersionId,
            Map<String, Object> base, Map<String, Object> draft, Map<String, Object> current) {
        List<SchemaDraftChangeDto> changes = new ArrayList<>();
        compare("", node(base), node(draft), node(current), changes);
        return new SchemaDraftDiffDto(baseVersionId, currentVersionId, hash(current),
                changes.stream().anyMatch(SchemaDraftChangeDto::conflict), changes);
    }

    public Map<String, Object> merge(Map<String, Object> current, SchemaDraftDiffDto diff,
            Map<String, SchemaDraftMergeSide> resolutions) {
        @SuppressWarnings("unchecked")
        Map<String, Object> merged = (Map<String, Object>) copy(current);
        for (SchemaDraftChangeDto change : diff.changes()) {
            SchemaDraftMergeSide side = change.conflict()
                    ? resolutions.get(change.path())
                    : change.draftChanged() ? SchemaDraftMergeSide.INCOMING : SchemaDraftMergeSide.CURRENT;
            if (side == SchemaDraftMergeSide.INCOMING) {
                apply(merged, change.path(), change.draftPresent(), change.draftValue());
            }
        }
        return merged;
    }

    private void compare(String path, Node base, Node draft, Node current, List<SchemaDraftChangeDto> changes) {
        if (same(base, draft) && same(base, current)) return;
        if (allMaps(base, draft, current)) {
            Set<String> keys = new LinkedHashSet<>();
            keys.addAll(map(base).keySet());
            keys.addAll(map(draft).keySet());
            keys.addAll(map(current).keySet());
            keys.forEach(key -> compare(path + "/" + escape(key), child(base, key), child(draft, key),
                    child(current, key), changes));
            return;
        }
        if (comparableArrays(base, draft, current)) {
            for (int i = 0; i < list(base).size(); i++) {
                compare(path + "/" + i, child(base, i), child(draft, i), child(current, i), changes);
            }
            return;
        }
        boolean draftChanged = !same(base, draft);
        boolean currentChanged = !same(base, current);
        changes.add(new SchemaDraftChangeDto(path, value(base), value(draft), value(current),
                base.present, draft.present, current.present, draftChanged,
                draftChanged && currentChanged && !same(draft, current)));
    }

    private boolean comparableArrays(Node base, Node draft, Node current) {
        if (!allLists(base, draft, current)) return false;
        List<?> baseList = list(base);
        if (baseList.size() != list(draft).size() || baseList.size() != list(current).size()) return false;
        String key = identityKey(baseList, list(draft), list(current));
        return key == null || orderedIds(baseList, key) != null
                && orderedIds(baseList, key).equals(orderedIds(list(draft), key))
                && orderedIds(baseList, key).equals(orderedIds(list(current), key));
    }

    private String identityKey(List<?>... values) {
        if (hasAnyKey("id", values)) return "id";
        return hasAnyKey("modelId", values) ? "modelId" : null;
    }

    private boolean hasAnyKey(String key, List<?>... values) {
        for (List<?> list : values) {
            for (Object value : list) {
                if (value instanceof Map<?, ?> map && map.containsKey(key)) return true;
            }
        }
        return false;
    }

    private List<Object> orderedIds(List<?> values, String key) {
        Set<Object> seen = new LinkedHashSet<>();
        List<Object> result = new ArrayList<>();
        for (Object value : values) {
            if (!(value instanceof Map<?, ?> map) || !map.containsKey(key)) return null;
            Object id = map.get(key);
            if (id == null || !seen.add(id)) return null;
            result.add(id);
        }
        return result;
    }

    private void apply(Map<String, Object> root, String pointer, boolean present, Object value) {
        List<String> tokens = tokens(pointer);
        Object parent = root;
        for (int i = 0; i < tokens.size() - 1; i++) parent = get(parent, tokens.get(i), pointer);
        String last = tokens.getLast();
        if (parent instanceof Map<?, ?> raw) {
            @SuppressWarnings("unchecked") Map<String, Object> map = (Map<String, Object>) raw;
            if (present) map.put(last, copy(value)); else map.remove(last);
        } else if (parent instanceof List<?> raw) {
            @SuppressWarnings("unchecked") List<Object> list = (List<Object>) raw;
            int index = index(last, pointer);
            if (present) list.set(index, copy(value)); else list.remove(index);
        } else throw invalid(pointer);
    }

    private Object get(Object parent, String token, String pointer) {
        if (parent instanceof Map<?, ?> map && map.containsKey(token)) return map.get(token);
        if (parent instanceof List<?> list) {
            int index = index(token, pointer);
            if (index < list.size()) return list.get(index);
        }
        throw invalid(pointer);
    }

    private List<String> tokens(String pointer) {
        if (pointer.isEmpty() || !pointer.startsWith("/")) throw invalid(pointer);
        return java.util.Arrays.stream(pointer.substring(1).split("/", -1))
                .map(token -> token.replace("~1", "/").replace("~0", "~")).toList();
    }

    private int index(String token, String pointer) {
        try { return Integer.parseInt(token); }
        catch (NumberFormatException exception) { throw invalid(pointer); }
    }

    private IllegalArgumentException invalid(String pointer) {
        return new IllegalArgumentException("Invalid merge path: " + pointer);
    }

    private Node child(Node node, String key) {
        if (!node.present || !(node.value instanceof Map<?, ?> map) || !map.containsKey(key)) return Node.MISSING;
        return node(map.get(key));
    }

    private Node child(Node node, int index) {
        if (!node.present || !(node.value instanceof List<?> values) || index >= values.size()) return Node.MISSING;
        return node(values.get(index));
    }

    private boolean allMaps(Node... nodes) {
        return java.util.Arrays.stream(nodes).allMatch(node -> node.present && node.value instanceof Map<?, ?>);
    }

    private boolean allLists(Node... nodes) {
        return java.util.Arrays.stream(nodes).allMatch(node -> node.present && node.value instanceof List<?>);
    }

    @SuppressWarnings("unchecked") private Map<String, Object> map(Node node) { return (Map<String, Object>) node.value; }
    @SuppressWarnings("unchecked") private List<Object> list(Node node) { return (List<Object>) node.value; }
    private boolean same(Node left, Node right) { return left.present == right.present && Objects.equals(left.value, right.value); }
    private Object value(Node node) { return node.present ? copy(node.value) : null; }
    private Node node(Object value) { return new Node(true, value); }
    private String escape(String token) { return token.replace("~", "~0").replace("/", "~1"); }

    private Object copy(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, child) -> result.put(String.valueOf(key), copy(child)));
            return result;
        }
        if (value instanceof List<?> list) return list.stream().map(this::copy)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        return value;
    }

    private String hash(Object value) {
        try {
            byte[] json = CANONICAL_JSON.writeValueAsBytes(value);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Cannot fingerprint schema document", exception);
        }
    }

    private record Node(boolean present, Object value) { private static final Node MISSING = new Node(false, null); }
}
