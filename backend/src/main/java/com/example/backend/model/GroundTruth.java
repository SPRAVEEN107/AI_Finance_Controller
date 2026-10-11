package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ground_truth")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroundTruth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String transactionId;

    private String expectedStatus; // MATCHED, REVIEW, EXCEPTION
    private String expectedExceptionType; // NONE, AMOUNT_MISMATCH, MISSING_PAYMENT, MISSING_INVOICE, DUPLICATE, SETTLEMENT_FEE_DIFFERENCE
}
