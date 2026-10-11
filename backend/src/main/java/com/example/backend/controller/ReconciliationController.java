package com.example.backend.controller;

import com.example.backend.model.EvaluationResult;
import com.example.backend.model.ReconciliationRecord;
import com.example.backend.repository.EvaluationResultRepository;
import com.example.backend.repository.ReconciliationRecordRepository;
import com.example.backend.service.EvaluationEngineService;
import com.example.backend.service.ReconciliationEngineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReconciliationController {

    private final ReconciliationEngineService reconService;
    private final EvaluationEngineService evalService;
    private final ReconciliationRecordRepository reconRepo;
    private final EvaluationResultRepository evalRepo;

    @PostMapping("/run")
    public ResponseEntity<?> runReconciliation() {
        long startTime = System.currentTimeMillis();
        List<ReconciliationRecord> records = reconService.runReconciliation();
        long duration = System.currentTimeMillis() - startTime;

        EvaluationResult evalResult = evalService.evaluatePerformance(duration);

        return ResponseEntity.ok(Map.of(
                "recordsProcessed", records.size(),
                "executionTimeMs", duration,
                "evaluation", evalResult
        ));
    }

    @GetMapping("/records")
    public ResponseEntity<List<ReconciliationRecord>> getAllRecords(@RequestParam(required = false) String status) {
        if (status != null && !status.isEmpty()) {
            return ResponseEntity.ok(reconRepo.findByStatus(status.toUpperCase()));
        }
        return ResponseEntity.ok(reconRepo.findAll());
    }

    @GetMapping("/evaluation")
    public ResponseEntity<?> getLatestEvaluation() {
        return evalRepo.findTopByOrderByEvaluatedAtDesc()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
