package com.example.backend.service;

import com.example.backend.model.EvaluationResult;
import com.example.backend.model.GroundTruth;
import com.example.backend.model.ReconciliationRecord;
import com.example.backend.repository.EvaluationResultRepository;
import com.example.backend.repository.GroundTruthRepository;
import com.example.backend.repository.ReconciliationRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluationEngineService {

    private final ReconciliationRecordRepository reconRepo;
    private final GroundTruthRepository groundTruthRepo;
    private final EvaluationResultRepository evalRepo;

    @Transactional
    public EvaluationResult evaluatePerformance(long processingTimeMs) {
        log.info("Running evaluation engine against ground-truth benchmarks...");

        List<ReconciliationRecord> reconRecords = reconRepo.findAll();
        List<GroundTruth> groundTruthList = groundTruthRepo.findAll();

        Map<String, GroundTruth> truthMap = groundTruthList.stream()
                .collect(Collectors.toMap(GroundTruth::getTransactionId, Function.identity(), (a, b) -> a));

        int totalRecords = reconRecords.size();
        int matchedCount = 0;
        int reviewCount = 0;
        int exceptionCount = 0;

        int truePositives = 0;  // System predicted MATCHED and Ground Truth expected MATCHED
        int falsePositives = 0; // System predicted MATCHED but Ground Truth expected EXCEPTION/REVIEW
        int falseNegatives = 0; // System predicted EXCEPTION/REVIEW but Ground Truth expected MATCHED

        for (ReconciliationRecord rec : reconRecords) {
            GroundTruth truth = truthMap.get(rec.getTransactionId());

            if ("MATCHED".equalsIgnoreCase(rec.getStatus())) {
                matchedCount++;
            } else if ("REVIEW".equalsIgnoreCase(rec.getStatus())) {
                reviewCount++;
            } else {
                exceptionCount++;
            }

            if (truth != null) {
                boolean isPredictedMatched = "MATCHED".equalsIgnoreCase(rec.getStatus());
                boolean isExpectedMatched = "MATCHED".equalsIgnoreCase(truth.getExpectedStatus());

                if (isPredictedMatched && isExpectedMatched) {
                    truePositives++;
                } else if (isPredictedMatched && !isExpectedMatched) {
                    falsePositives++;
                } else if (!isPredictedMatched && isExpectedMatched) {
                    falseNegatives++;
                }
            }
        }

        double matchRate = totalRecords > 0 ? ((double) matchedCount / totalRecords) * 100.0 : 0.0;
        double precision = (truePositives + falsePositives) > 0 ? ((double) truePositives / (truePositives + falsePositives)) * 100.0 : 100.0;
        double recall = (truePositives + falseNegatives) > 0 ? ((double) truePositives / (truePositives + falseNegatives)) * 100.0 : 100.0;
        double f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0.0;

        double durationSec = Math.max(0.001, processingTimeMs / 1000.0);
        double throughput = totalRecords / durationSec;

        EvaluationResult evalResult = EvaluationResult.builder()
                .batchId("BATCH-" + UUID.randomUUID().toString().substring(0, 8))
                .totalRecords(totalRecords)
                .matchedCount(matchedCount)
                .reviewCount(reviewCount)
                .exceptionCount(exceptionCount)
                .matchRate(Math.round(matchRate * 100.0) / 100.0)
                .precisionMetric(Math.round(precision * 100.0) / 100.0)
                .recallMetric(Math.round(recall * 100.0) / 100.0)
                .f1Score(Math.round(f1Score * 100.0) / 100.0)
                .processingTimeMs(processingTimeMs)
                .throughput(Math.round(throughput * 100.0) / 100.0)
                .evaluatedAt(LocalDateTime.now())
                .build();

        evalRepo.save(evalResult);
        log.info("Evaluation complete. Precision: {}%, Recall: {}%, F1: {}%, Throughput: {} rec/sec",
                evalResult.getPrecisionMetric(), evalResult.getRecallMetric(), evalResult.getF1Score(), evalResult.getThroughput());

        return evalResult;
    }
}
