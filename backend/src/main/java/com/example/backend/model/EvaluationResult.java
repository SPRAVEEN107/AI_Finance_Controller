package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String batchId;
    private Integer totalRecords;
    private Integer matchedCount;
    private Integer reviewCount;
    private Integer exceptionCount;

    private Double matchRate;
    private Double precisionMetric;
    private Double recallMetric;
    private Double f1Score;

    private Long processingTimeMs;
    private Double throughput; // records / sec

    private LocalDateTime evaluatedAt;
}
