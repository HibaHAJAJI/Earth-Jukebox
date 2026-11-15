package org.example.controller.v1;

import org.example.dto.ExplainRequest;
import org.example.dto.ExplainResponse;
import org.example.service.ai.ExplanationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for NASA data explanation endpoints.
 *
 * <p>Supports POST /api/v1/ai/explain for explaining a selected year or year-month.
 * No GET endpoints. No chat functionality. No comparison endpoint in this step.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class ExplanationController {

    private final ExplanationService explanationService;

    public ExplanationController(ExplanationService explanationService) {
        this.explanationService = explanationService;
    }

    /**
     * Explains NASA temperature data for a selected year or year-month.
     *
     * @param request valid ExplainRequest with year and optional month
     * @return structured explanation response with FACTS/STATISTICS/INTERPRETATION
     */
    @PostMapping("/explain")
    public ResponseEntity<ExplainResponse> explain(@RequestBody @Valid ExplainRequest request) {
        ExplainResponse response = explanationService.explain(request.year(), request.month(), request.language());
        return ResponseEntity.ok(response);
    }
}
