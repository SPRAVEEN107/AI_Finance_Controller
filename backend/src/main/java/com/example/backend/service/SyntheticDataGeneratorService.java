package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyntheticDataGeneratorService {

    private final BankTransactionRepository bankRepo;
    private final PaymentRepository paymentRepo;
    private final InvoiceRepository invoiceRepo;
    private final SettlementRepository settlementRepo;
    private final GroundTruthRepository groundTruthRepo;
    private final ReconciliationRecordRepository reconRepo;
    private final EvaluationResultRepository evalRepo;

    @Transactional
    public String generateSyntheticDataset(int recordCount) {
        log.info("Generating {} synthetic records across multi-source financial datasets...", recordCount);

        // Clear existing records cleanly in batch
        reconRepo.deleteAllInBatch();
        evalRepo.deleteAllInBatch();
        bankRepo.deleteAllInBatch();
        paymentRepo.deleteAllInBatch();
        invoiceRepo.deleteAllInBatch();
        settlementRepo.deleteAllInBatch();
        groundTruthRepo.deleteAllInBatch();

        reconRepo.flush();
        evalRepo.flush();
        bankRepo.flush();
        paymentRepo.flush();
        invoiceRepo.flush();
        settlementRepo.flush();
        groundTruthRepo.flush();

        String[] customers = {"Amazon", "Flipkart", "TechCorp", "AcmeInc", "GlobalLogistics", "OmniMedia", "CyberDyn", "NexusGroup", "Starlight", "Vanguard"};
        Random random = new Random(42); // Fixed seed for reproducible benchmarks

        List<BankTransaction> bankList = new ArrayList<>();
        List<Payment> paymentList = new ArrayList<>();
        List<Invoice> invoiceList = new ArrayList<>();
        List<Settlement> settlementList = new ArrayList<>();
        List<GroundTruth> groundTruthList = new ArrayList<>();

        for (int i = 1; i <= recordCount; i++) {
            String txId = String.format("TXN-%04d", i);
            String payId = String.format("PAY-%04d", i);
            String invId = String.format("INV-%04d", i);
            String setId = String.format("SET-%04d", i);

            LocalDate txDate = LocalDate.now().minusDays(random.nextInt(30));
            String customer = customers[i % customers.length];
            BigDecimal baseAmount = BigDecimal.valueOf(1000 + random.nextInt(90000)).setScale(2, RoundingMode.HALF_UP);

            // Determine scenario based on index modulo
            int scenario = i % 10;
            String expectedStatus;
            String expectedExceptionType;

            if (scenario <= 5) {
                // Exact Match (60% of data)
                expectedStatus = "MATCHED";
                expectedExceptionType = "NONE";

                bankList.add(BankTransaction.builder().transactionId(txId).date(txDate).customer(customer).amount(baseAmount).description("Settlement for " + txId).build());
                paymentList.add(Payment.builder().paymentId(payId).reference(txId).date(txDate).customer(customer).amount(baseAmount).gateway("Stripe").build());
                invoiceList.add(Invoice.builder().invoiceId(invId).date(txDate.minusDays(3)).customer(customer).amount(baseAmount).dueDate(txDate.plusDays(15)).status("PAID").build());
                settlementList.add(Settlement.builder().settlementId(setId).reference(txId).date(txDate).grossAmount(baseAmount).feeAmount(BigDecimal.ZERO).netAmount(baseAmount).build());

            } else if (scenario == 6) {
                // Amount Mismatch (10% of data)
                expectedStatus = "EXCEPTION";
                expectedExceptionType = "AMOUNT_MISMATCH";

                BigDecimal mismatchedAmount = baseAmount.subtract(BigDecimal.valueOf(350.00));
                bankList.add(BankTransaction.builder().transactionId(txId).date(txDate).customer(customer).amount(baseAmount).description("Payment for " + txId).build());
                paymentList.add(Payment.builder().paymentId(payId).reference(txId).date(txDate).customer(customer).amount(mismatchedAmount).gateway("Razorpay").build());
                invoiceList.add(Invoice.builder().invoiceId(invId).date(txDate.minusDays(2)).customer(customer).amount(baseAmount).dueDate(txDate.plusDays(10)).status("DISCREPANCY").build());

            } else if (scenario == 7) {
                // Missing Payment (10% of data)
                expectedStatus = "EXCEPTION";
                expectedExceptionType = "MISSING_PAYMENT";

                bankList.add(BankTransaction.builder().transactionId(txId).date(txDate).customer(customer).amount(baseAmount).description("Wire transfer " + txId).build());
                invoiceList.add(Invoice.builder().invoiceId(invId).date(txDate.minusDays(5)).customer(customer).amount(baseAmount).dueDate(txDate.plusDays(5)).status("UNPAID").build());

            } else if (scenario == 8) {
                // Settlement Fee Difference (Review required - 10% of data)
                expectedStatus = "REVIEW";
                expectedExceptionType = "SETTLEMENT_FEE_DIFFERENCE";

                BigDecimal fee = baseAmount.multiply(BigDecimal.valueOf(0.025)).setScale(2, RoundingMode.HALF_UP); // 2.5% fee
                BigDecimal net = baseAmount.subtract(fee);

                bankList.add(BankTransaction.builder().transactionId(txId).date(txDate).customer(customer).amount(net).description("Net Settlement " + txId).build());
                paymentList.add(Payment.builder().paymentId(payId).reference(txId).date(txDate).customer(customer).amount(baseAmount).gateway("Stripe").build());
                settlementList.add(Settlement.builder().settlementId(setId).reference(txId).date(txDate).grossAmount(baseAmount).feeAmount(fee).netAmount(net).build());

            } else {
                // Duplicate Transaction (10% of data)
                expectedStatus = "EXCEPTION";
                expectedExceptionType = "DUPLICATE";

                bankList.add(BankTransaction.builder().transactionId(txId).date(txDate).customer(customer).amount(baseAmount).description("Duplicate Entry " + txId).build());
                paymentList.add(Payment.builder().paymentId(payId).reference(txId).date(txDate).customer(customer).amount(baseAmount).gateway("Stripe").build());
                paymentList.add(Payment.builder().paymentId(payId + "-DUP").reference(txId).date(txDate).customer(customer).amount(baseAmount).gateway("Stripe").build());
            }

            groundTruthList.add(GroundTruth.builder()
                    .transactionId(txId)
                    .expectedStatus(expectedStatus)
                    .expectedExceptionType(expectedExceptionType)
                    .build());
        }

        bankRepo.saveAll(bankList);
        paymentRepo.saveAll(paymentList);
        invoiceRepo.saveAll(invoiceList);
        settlementRepo.saveAll(settlementList);
        groundTruthRepo.saveAll(groundTruthList);

        log.info("Successfully populated database with {} multi-source records.", recordCount);
        return String.format("Generated dataset with %d records (Bank: %d, Payments: %d, Invoices: %d, Settlements: %d, Ground Truth: %d)",
                recordCount, bankList.size(), paymentList.size(), invoiceList.size(), settlementList.size(), groundTruthList.size());
    }
}
