package seed

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func SeedDevelopmentData(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) error {
	slog.Info("Starting development data seeding")

	// Initialize repositories and services
	repos := repositories.NewRootRepository(ctx, pool)
	rootSvc := services.NewRootService(repos, rdb)

	// Seed accounts
	accounts := []models.CreateAccountModel{
		{Name: "Dompet Utama", Type: "expense", Note: "Dompet utama untuk pengeluaran sehari-hari", Icon: func() *string { s := "wallet"; return &s }(), IconColor: func() *string { s := "#4CAF50"; return &s }()},
		{Name: "Tabungan Mandiri", Type: "income", Note: "Tabungan di bank Mandiri untuk masa depan", Icon: func() *string { s := "piggy-bank"; return &s }(), IconColor: func() *string { s := "#2196F3"; return &s }()},
		{Name: "Kartu Kredit BCA", Type: "expense", Note: "Kartu kredit BCA dengan limit tinggi", Icon: func() *string { s := "credit-card"; return &s }(), IconColor: func() *string { s := "#FF9800"; return &s }()},
		{Name: "Rekening Gaji", Type: "income", Note: "Rekening untuk menerima gaji bulanan", Icon: func() *string { s := "building"; return &s }(), IconColor: func() *string { s := "#9C27B0"; return &s }()},
		{Name: "Dompet Digital GoPay", Type: "expense", Note: "E-wallet GoPay untuk transaksi online", Icon: func() *string { s := "mobile"; return &s }(), IconColor: func() *string { s := "#00BCD4"; return &s }()},
		{Name: "Tabungan Darurat", Type: "income", Note: "Dana darurat untuk keperluan mendadak", Icon: func() *string { s := "shield"; return &s }(), IconColor: func() *string { s := "#FF5722"; return &s }()},
	}

	var accountIDs []int64
	for _, acc := range accounts {
		account, err := rootSvc.Acc.Create(ctx, acc)
		if err != nil {
			return fmt.Errorf("failed to create account %s: %w", acc.Name, err)
		}
		accountIDs = append(accountIDs, account.ID)
		slog.Info("Created account", "id", account.ID, "name", account.Name)
	}

	// Seed categories
	categories := []models.CreateCategoryModel{
		{Name: "Makanan & Minuman", Type: "expense", Note: "Restoran, warung, dan belanja bahan makanan", Icon: func() *string { s := "utensils"; return &s }(), IconColor: func() *string { s := "#FF5722"; return &s }()},
		{Name: "Transportasi", Type: "expense", Note: "Angkutan umum, bensin, ojek online", Icon: func() *string { s := "car"; return &s }(), IconColor: func() *string { s := "#9C27B0"; return &s }()},
		{Name: "Hiburan", Type: "expense", Note: "Bioskop, game, hobi, dan rekreasi", Icon: func() *string { s := "gamepad"; return &s }(), IconColor: func() *string { s := "#3F51B5"; return &s }()},
		{Name: "Belanja Online", Type: "expense", Note: "Shopee, Tokopedia, Lazada", Icon: func() *string { s := "shopping-cart"; return &s }(), IconColor: func() *string { s := "#E91E63"; return &s }()},
		{Name: "Tagihan", Type: "expense", Note: "Listrik, air, internet, telepon", Icon: func() *string { s := "file-invoice-dollar"; return &s }(), IconColor: func() *string { s := "#607D8B"; return &s }()},
		{Name: "Kesehatan", Type: "expense", Note: "Obat-obatan, dokter, asuransi", Icon: func() *string { s := "heartbeat"; return &s }(), IconColor: func() *string { s := "#4CAF50"; return &s }()},
		{Name: "Pendidikan", Type: "expense", Note: "Kursus, buku, seminar", Icon: func() *string { s := "graduation-cap"; return &s }(), IconColor: func() *string { s := "#2196F3"; return &s }()},
		{Name: "Gaji", Type: "income", Note: "Penghasilan tetap bulanan", Icon: func() *string { s := "money-bill"; return &s }(), IconColor: func() *string { s := "#4CAF50"; return &s }()},
		{Name: "Freelance", Type: "income", Note: "Proyek freelance dan side job", Icon: func() *string { s := "laptop"; return &s }(), IconColor: func() *string { s := "#00BCD4"; return &s }()},
		{Name: "Bonus", Type: "income", Note: "Bonus tahunan dan insentif", Icon: func() *string { s := "gift"; return &s }(), IconColor: func() *string { s := "#FF9800"; return &s }()},
		{Name: "Transfer", Type: "transfer", Note: "Transfer antar rekening", Icon: func() *string { s := "exchange-alt"; return &s }(), IconColor: func() *string { s := "#607D8B"; return &s }()},
	}

	var categoryIDs []int64
	for _, cat := range categories {
		category, err := rootSvc.Cat.Create(ctx, cat)
		if err != nil {
			return fmt.Errorf("failed to create category %s: %w", cat.Name, err)
		}
		categoryIDs = append(categoryIDs, category.ID)
		slog.Info("Created category", "id", category.ID, "name", category.Name)
	}

	// Seed tags
	tags := []models.CreateTagModel{
		{Name: "penting"},
		{Name: "berulang"},
		{Name: "bisnis"},
		{Name: "pribadi"},
		{Name: "pajak"},
		{Name: "darurat"},
		{Name: "investasi"},
		{Name: "liburan"},
		{Name: "hadiah"},
		{Name: "online"},
	}

	var tagIDs []int64
	for _, tag := range tags {
		tagModel, err := rootSvc.Tag.Create(ctx, tag)
		if err != nil {
			return fmt.Errorf("failed to create tag %s: %w", tag.Name, err)
		}
		tagIDs = append(tagIDs, tagModel.ID)
		slog.Info("Created tag", "id", tagModel.ID, "name", tagModel.Name)
	}

	// Map for easy access
	accountMap := map[string]int64{
		"Dompet Utama":         accountIDs[0],
		"Tabungan Mandiri":     accountIDs[1],
		"Kartu Kredit BCA":     accountIDs[2],
		"Rekening Gaji":        accountIDs[3],
		"Dompet Digital GoPay": accountIDs[4],
		"Tabungan Darurat":     accountIDs[5],
	}

	categoryMap := map[string]int64{
		"Makanan & Minuman": categoryIDs[0],
		"Transportasi":      categoryIDs[1],
		"Hiburan":           categoryIDs[2],
		"Belanja Online":    categoryIDs[3],
		"Tagihan":           categoryIDs[4],
		"Kesehatan":         categoryIDs[5],
		"Pendidikan":        categoryIDs[6],
		"Gaji":              categoryIDs[7],
		"Freelance":         categoryIDs[8],
		"Bonus":             categoryIDs[9],
		"Transfer":          categoryIDs[10],
	}

	tagMap := map[string]int64{
		"penting":   tagIDs[0],
		"berulang":  tagIDs[1],
		"bisnis":    tagIDs[2],
		"pribadi":   tagIDs[3],
		"pajak":     tagIDs[4],
		"darurat":   tagIDs[5],
		"investasi": tagIDs[6],
		"liburan":   tagIDs[7],
		"hadiah":    tagIDs[8],
		"online":    tagIDs[9],
	}

	// Seed transactions
	transactions := []models.CreateTransactionModel{
		{
			Type:       "income",
			Date:       time.Now().AddDate(0, 0, -30),
			Amount:     8000000,
			AccountID:  accountMap["Rekening Gaji"],
			CategoryID: categoryMap["Gaji"],
			Note:       func() *string { s := "Gaji bulan Januari 2024"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -28),
			Amount:     150000,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Note:       func() *string { s := "Makan siang di warung"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -27),
			Amount:     50000,
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Transportasi"],
			Note:       func() *string { s := "GoRide ke kantor"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -25),
			Amount:     250000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli laptop di Shopee"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -24),
			Amount:     750000,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Tagihan"],
			Note:       func() *string { s := "Bayar listrik dan internet"; return &s }(),
		},
		{
			Type:       "income",
			Date:       time.Now().AddDate(0, 0, -22),
			Amount:     2500000,
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Note:       func() *string { s := "Proyek website perusahaan"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -20),
			Amount:     100000,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Tiket bioskop"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -18),
			Amount:     200000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Kesehatan"],
			Note:       func() *string { s := "Kontrol ke dokter"; return &s }(),
		},
		{
			Type:                 "transfer",
			Date:                 time.Now().AddDate(0, 0, -15),
			Amount:               1000000,
			AccountID:            accountMap["Rekening Gaji"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Tabungan Mandiri"]; return &id }(),
			Note:                 func() *string { s := "Transfer gaji ke tabungan"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -12),
			Amount:     500000,
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli buku programming"; return &s }(),
		},
		{
			Type:       "income",
			Date:       time.Now().AddDate(0, 0, -10),
			Amount:     1500000,
			AccountID:  accountMap["Tabungan Darurat"],
			CategoryID: categoryMap["Bonus"],
			Note:       func() *string { s := "Bonus akhir tahun"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -8),
			Amount:     300000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Transportasi"],
			Note:       func() *string { s := "Bensin motor"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -5),
			Amount:     80000,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Note:       func() *string { s := "Makan malam keluarga"; return &s }(),
		},
		{
			Type:                 "transfer",
			Date:                 time.Now().AddDate(0, 0, -3),
			Amount:               500000,
			AccountID:            accountMap["Tabungan Mandiri"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Dompet Digital GoPay"]; return &id }(),
			Note:                 func() *string { s := "Top up GoPay"; return &s }(),
		},
		{
			Type:       "expense",
			Date:       time.Now().AddDate(0, 0, -1),
			Amount:     150000,
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Beli game online"; return &s }(),
		},
	}

	// Track transactions with their tags for later association
	type transactionWithTags struct {
		Transaction models.CreateTransactionModel
		Tags        []string
	}

	transactionTags := []transactionWithTags{
		{transactions[0], []string{"berulang"}},             // Gaji bulan Januari
		{transactions[1], nil},                              // Makan siang di warung
		{transactions[2], []string{"online"}},               // GoRide ke kantor
		{transactions[3], []string{"online", "penting"}},    // Beli laptop di Shopee
		{transactions[4], []string{"berulang"}},             // Bayar listrik dan internet
		{transactions[5], []string{"bisnis"}},               // Proyek website perusahaan
		{transactions[6], []string{"pribadi"}},              // Tiket bioskop
		{transactions[7], []string{"penting"}},              // Kontrol ke dokter
		{transactions[8], nil},                              // Transfer gaji ke tabungan
		{transactions[9], []string{"pendidikan", "online"}}, // Beli buku programming
		{transactions[10], []string{"hadiah"}},              // Bonus akhir tahun
		{transactions[11], nil},                             // Bensin motor
		{transactions[12], []string{"pribadi"}},             // Makan malam keluarga
		{transactions[13], nil},                             // Top up GoPay
		{transactions[14], []string{"online", "pribadi"}},   // Beli game online
	}

	var transactionIDs []int64
	for _, txWithTags := range transactionTags {
		transaction, err := rootSvc.Tsct.Create(ctx, txWithTags.Transaction)
		if err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}

		transactionIDs = append(transactionIDs, transaction.ID)
		slog.Info("Created transaction", "id", transaction.ID, "type", transaction.Type, "amount", transaction.Amount)

		// Add tags if any
		for _, tagName := range txWithTags.Tags {
			if tagID, exists := tagMap[tagName]; exists {
				_, err := rootSvc.TsctTag.Create(ctx, models.CreateTransactionTagModel{
					TransactionID: transaction.ID,
					TagID:         tagID,
				})
				if err != nil {
					return fmt.Errorf("failed to add tag %s to transaction %d: %w", tagName, transaction.ID, err)
				}
			}
		}
	}

	// Seed budgets - different types for comprehensive testing
	budgets := []models.CreateBudgetModel{
		// Account-only budgets
		{
			AccountID:   func() *int64 { id := accountMap["Dompet Utama"]; return &id }(),
			PeriodStart: time.Now().AddDate(0, 0, -14), // 2 weeks ago
			PeriodEnd:   time.Now().AddDate(0, 0, 14),  // 2 weeks from now
			AmountLimit: 2000000,                       // 2 million IDR for main wallet
			Name:        "Budget Dompet Utama Bulanan",
			Note:        func() *string { s := "Budget pengeluaran harian dari dompet utama"; return &s }(),
		},
		{
			AccountID:   func() *int64 { id := accountMap["Kartu Kredit BCA"]; return &id }(),
			PeriodStart: time.Now().AddDate(0, 0, -14),
			PeriodEnd:   time.Now().AddDate(0, 0, 14),
			AmountLimit: 5000000, // 5 million IDR credit limit
			Name:        "Limit Kartu Kredit BCA",
			Note:        func() *string { s := "Batas maksimal penggunaan kartu kredit"; return &s }(),
		},
		// Category-only budgets
		{
			CategoryID:  func() *int64 { id := categoryMap["Makanan & Minuman"]; return &id }(),
			PeriodStart: time.Now().AddDate(0, 0, -14),
			PeriodEnd:   time.Now().AddDate(0, 0, 14),
			AmountLimit: 1500000, // 1.5 million IDR for food
			Name:        "Budget Makanan & Minuman",
			Note:        func() *string { s := "Budget untuk makan di restoran dan bahan makanan"; return &s }(),
		},
		{
			CategoryID:  func() *int64 { id := categoryMap["Transportasi"]; return &id }(),
			PeriodStart: time.Now().AddDate(0, 0, -14),
			PeriodEnd:   time.Now().AddDate(0, 0, 14),
			AmountLimit: 800000, // 800k IDR for transport
			Name:        "Budget Transportasi",
			Note:        func() *string { s := "Budget untuk bensin, ojek online, dan angkutan umum"; return &s }(),
		},
	}

	var budgetIDs []int64
	for _, budget := range budgets {
		budgetModel, err := rootSvc.BudgTem.CreateBudget(ctx, budget)
		if err != nil {
			return fmt.Errorf("failed to create budget %s: %w", budget.Name, err)
		}
		budgetIDs = append(budgetIDs, budgetModel.ID)
		slog.Info("Created budget", "id", budgetModel.ID, "name", budgetModel.Name)
	}

	// Seed transaction templates for recurring transactions
	transactionTemplates := []models.CreateTransactionTemplateModel{
		// Monthly salary
		{
			Name:       "Gaji Bulanan PT Maju Jaya",
			Type:       "income",
			Amount:     8000000, // 8 million IDR monthly salary
			AccountID:  accountMap["Rekening Gaji"],
			CategoryID: categoryMap["Gaji"],
			Recurrence: "monthly",
			StartDate:  time.Now().AddDate(0, 0, -30),                                        // Started a month ago
			EndDate:    func() *time.Time { t := time.Now().AddDate(0, 12, 0); return &t }(), // 1 year from now
			Note:       func() *string { s := "Gaji tetap bulanan dari pekerjaan utama"; return &s }(),
		},
		// Monthly internet bill
		{
			Name:       "Tagihan Internet Indihome",
			Type:       "expense",
			Amount:     350000, // 350k IDR monthly internet
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Tagihan"],
			Recurrence: "monthly",
			StartDate:  time.Now().AddDate(0, 0, -14),
			EndDate:    func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(), // 6 months
			Note:       func() *string { s := "Tagihan internet bulanan Indihome 50Mbps"; return &s }(),
		},
		// Weekly grocery shopping
		{
			Name:       "Belanja Mingguan Supermarket",
			Type:       "expense",
			Amount:     250000, // 250k IDR weekly groceries
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Recurrence: "weekly",
			StartDate:  time.Now().AddDate(0, 0, -14),
			EndDate:    func() *time.Time { t := time.Now().AddDate(0, 2, 0); return &t }(), // 2 months
			Note:       func() *string { s := "Belanja bahan makanan mingguan di supermarket"; return &s }(),
		},
		// Monthly electricity bill
		{
			Name:       "Tagihan Listrik PLN",
			Type:       "expense",
			Amount:     450000, // 450k IDR monthly electricity
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Tagihan"],
			Recurrence: "monthly",
			StartDate:  time.Now().AddDate(0, 0, -14),
			EndDate:    func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(), // 6 months
			Note:       func() *string { s := "Tagihan listrik bulanan untuk rumah"; return &s }(),
		},
		// Installment for laptop purchase (12 months)
		{
			Name:       "Cicilan Laptop Gaming",
			Type:       "expense",
			Amount:     833333, // ~8.3 million total / 12 months
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Recurrence: "monthly",
			StartDate:  time.Now().AddDate(0, 0, -10),                                        // Started 10 days ago
			EndDate:    func() *time.Time { t := time.Now().AddDate(0, 14, 0); return &t }(), // 14 months from start
			Note:       func() *string { s := "Cicilan laptop gaming ASUS ROG 12 bulan"; return &s }(),
		},
	}

	var templateIDs []int64
	for _, template := range transactionTemplates {
		templateModel, err := rootSvc.TsctTem.Create(ctx, template)
		if err != nil {
			return fmt.Errorf("failed to create transaction template %s: %w", template.Name, err)
		}
		templateIDs = append(templateIDs, templateModel.ID)
		slog.Info("Created transaction template", "id", templateModel.ID, "name", templateModel.Name)
	}

	// Create some transactions from templates (simulating recurring execution)
	templateTransactions := []struct {
		TemplateID int64
		Date       time.Time
		Note       *string
	}{
		// Salary payments (last 2 months)
		{templateIDs[0], time.Now().AddDate(0, 0, -30), func() *string { s := "Gaji bulan Desember 2024"; return &s }()},
		{templateIDs[0], time.Now().AddDate(0, 0, -2), func() *string { s := "Gaji bulan Januari 2025"; return &s }()},

		// Internet bills (last 2 months)
		{templateIDs[1], time.Now().AddDate(0, 0, -30), func() *string { s := "Tagihan internet Desember 2024"; return &s }()},
		{templateIDs[1], time.Now().AddDate(0, 0, -2), func() *string { s := "Tagihan internet Januari 2025"; return &s }()},

		// Grocery shopping (last 2 weeks)
		{templateIDs[2], time.Now().AddDate(0, 0, -14), func() *string { s := "Belanja minggu ke-2 Januari"; return &s }()},
		{templateIDs[2], time.Now().AddDate(0, 0, -7), func() *string { s := "Belanja minggu ke-3 Januari"; return &s }()},
		{templateIDs[2], time.Now().AddDate(0, 0, -1), func() *string { s := "Belanja minggu ke-4 Januari"; return &s }()},

		// Electricity bills
		{templateIDs[3], time.Now().AddDate(0, 0, -30), func() *string { s := "Tagihan listrik Desember 2024"; return &s }()},
		{templateIDs[3], time.Now().AddDate(0, 0, -2), func() *string { s := "Tagihan listrik Januari 2025"; return &s }()},

		// Laptop installments (last 3 months)
		{templateIDs[4], time.Now().AddDate(0, 0, -10), func() *string { s := "Cicilan laptop bulan 1"; return &s }()},
		{templateIDs[4], time.Now().AddDate(0, 0, -2), func() *string { s := "Cicilan laptop bulan 2"; return &s }()},
	}

	var templateTransactionIDs []int64
	for _, tt := range templateTransactions {
		// Get template details
		template, err := rootSvc.TsctTem.GetDetail(ctx, tt.TemplateID)
		if err != nil {
			return fmt.Errorf("failed to get template %d: %w", tt.TemplateID, err)
		}

		// Create transaction from template
		createTx := models.CreateTransactionModel{
			Type:       template.Type,
			Date:       tt.Date,
			Amount:     template.Amount,
			AccountID:  template.Account.ID,
			CategoryID: template.Category.ID,
			Note:       tt.Note,
		}

		if template.DestinationAccount != nil {
			createTx.DestinationAccountID = &template.DestinationAccount.ID
		}

		transaction, err := rootSvc.Tsct.Create(ctx, createTx)
		if err != nil {
			return fmt.Errorf("failed to create transaction from template: %w", err)
		}

		templateTransactionIDs = append(templateTransactionIDs, transaction.ID)
		slog.Info("Created transaction from template", "template_id", tt.TemplateID, "transaction_id", transaction.ID)
	}

	// Create transaction relations to link related transactions
	transactionRelations := []struct {
		SourceTransactionID  int64
		RelatedTransactionID int64
		RelationType         string
	}{
		// Link salary to savings transfer
		{templateTransactionIDs[0], transactionIDs[8], "salary_to_savings"},  // First salary to first transfer
		{templateTransactionIDs[1], transactionIDs[13], "salary_to_savings"}, // Second salary to second transfer

		// Link laptop purchase to installments
		{transactionIDs[3], templateTransactionIDs[9], "purchase_to_installment"},  // Laptop purchase to first installment
		{transactionIDs[3], templateTransactionIDs[10], "purchase_to_installment"}, // Laptop purchase to second installment

		// Link bill payments to their templates
		{templateTransactionIDs[2], templateIDs[1], "bill_to_template"}, // Internet bill to template
		{templateTransactionIDs[3], templateIDs[1], "bill_to_template"}, // Internet bill to template
		{templateTransactionIDs[7], templateIDs[3], "bill_to_template"}, // Electricity bill to template
		{templateTransactionIDs[8], templateIDs[3], "bill_to_template"}, // Electricity bill to template

		// Link grocery transactions to template
		{templateTransactionIDs[4], templateIDs[2], "shopping_to_template"}, // Grocery shopping to template
		{templateTransactionIDs[5], templateIDs[2], "shopping_to_template"}, // Grocery shopping to template
		{templateTransactionIDs[6], templateIDs[2], "shopping_to_template"}, // Grocery shopping to template
	}

	for _, relation := range transactionRelations {
		_, err := rootSvc.TsctRel.Create(ctx, models.CreateTransactionRelationModel{
			SourceTransactionID:  relation.SourceTransactionID,
			RelatedTransactionID: relation.RelatedTransactionID,
			RelationType:         relation.RelationType,
		})
		if err != nil {
			return fmt.Errorf("failed to create transaction relation: %w", err)
		}
		slog.Info("Created transaction relation", "source", relation.SourceTransactionID, "related", relation.RelatedTransactionID, "type", relation.RelationType)
	}

	slog.Info("Development data seeding completed successfully")
	return nil
}
