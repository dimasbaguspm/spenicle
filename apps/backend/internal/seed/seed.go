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

	// Seed transactions - 3 months of data for realistic testing
	startDate := time.Now().AddDate(0, 0, -90)
	var transactions []models.CreateTransactionModel

	// Monthly income - 3 months
	for i := 0; i < 3; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, i, 5),
			Amount:     8000000,
			AccountID:  accountMap["Rekening Gaji"],
			CategoryID: categoryMap["Gaji"],
			Note:       func() *string { s := fmt.Sprintf("Gaji bulan ke-%d", i+1); return &s }(),
		})
	}

	// Freelance income - sporadic
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, 0, 15),
			Amount:     2500000,
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Note:       func() *string { s := "Proyek website perusahaan"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, 1, 20),
			Amount:     3000000,
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Note:       func() *string { s := "Konsultasi sistem database"; return &s }(),
		},
	)

	// Bonus income
	transactions = append(transactions, models.CreateTransactionModel{
		Type:       "income",
		Date:       startDate.AddDate(0, 0, 10),
		Amount:     1500000,
		AccountID:  accountMap["Tabungan Darurat"],
		CategoryID: categoryMap["Bonus"],
		Note:       func() *string { s := "Bonus akhir tahun"; return &s }(),
	})

	// Weekly groceries - ~13 weeks over 3 months
	for i := 0; i < 13; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*7+2),
			Amount:     200000 + int64((i%3)*50000),
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Note:       func() *string { s := fmt.Sprintf("Belanja mingguan ke-%d", i+1); return &s }(),
		})
	}

	// Monthly bills - 3 months each for electricity, internet, phone
	for i := 0; i < 3; i++ {
		transactions = append(transactions,
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 12),
				Amount:     450000,
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Note:       func() *string { s := fmt.Sprintf("Tagihan listrik bulan ke-%d", i+1); return &s }(),
			},
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 15),
				Amount:     350000,
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Note:       func() *string { s := fmt.Sprintf("Tagihan internet bulan ke-%d", i+1); return &s }(),
			},
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 18),
				Amount:     200000,
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Note:       func() *string { s := fmt.Sprintf("Tagihan telepon bulan ke-%d", i+1); return &s }(),
			},
		)
	}

	// Fuel/transport - biweekly over 3 months (~6 times)
	for i := 0; i < 6; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*14+3),
			Amount:     300000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Transportasi"],
			Note:       func() *string { s := "Bensin motor"; return &s }(),
		})
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*14+8),
			Amount:     50000,
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Transportasi"],
			Note:       func() *string { s := "GoRide ke kantor"; return &s }(),
		})
	}

	// Coffee/snacks - frequent small purchases (~19 times)
	for i := 0; i < 19; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*4+1),
			Amount:     25000 + int64((i%4)*10000),
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Note:       func() *string { s := "Kopi dan snack"; return &s }(),
		})
	}

	// One-time expenses - shopping, doctor, entertainment
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 8),
			Amount:     500000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli sepatu olahraga"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 5),
			Amount:     750000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli laptop accessories"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 10),
			Amount:     300000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli buku programming"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 25),
			Amount:     1200000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Beli monitor 27 inch"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 20),
			Amount:     200000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Kesehatan"],
			Note:       func() *string { s := "Kontrol ke dokter gigi"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 25),
			Amount:     350000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Kesehatan"],
			Note:       func() *string { s := "Beli obat dan vitamin"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 22),
			Amount:     100000,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Tiket bioskop"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 18),
			Amount:     150000,
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Beli game online"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 15),
			Amount:     450000,
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Tiket konser musik"; return &s }(),
		},
	)

	// Monthly transfers - salary to savings (3x)
	for i := 0; i < 3; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:                 "transfer",
			Date:                 startDate.AddDate(0, i, 8),
			Amount:               2000000,
			AccountID:            accountMap["Rekening Gaji"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Tabungan Mandiri"]; return &id }(),
			Note:                 func() *string { s := "Transfer gaji ke tabungan"; return &s }(),
		})
	}

	// E-wallet top-ups (4x over 3 months)
	for i := 0; i < 4; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:                 "transfer",
			Date:                 startDate.AddDate(0, 0, i*20+7),
			Amount:               500000,
			AccountID:            accountMap["Tabungan Mandiri"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Dompet Digital GoPay"]; return &id }(),
			Note:                 func() *string { s := "Top up GoPay"; return &s }(),
		})
	}

	// Emergency fund transfers (2x)
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:                 "transfer",
			Date:                 startDate.AddDate(0, 0, 28),
			Amount:               1000000,
			AccountID:            accountMap["Rekening Gaji"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Tabungan Darurat"]; return &id }(),
			Note:                 func() *string { s := "Transfer ke dana darurat"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:                 "transfer",
			Date:                 startDate.AddDate(0, 2, 5),
			Amount:               1500000,
			AccountID:            accountMap["Rekening Gaji"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Tabungan Darurat"]; return &id }(),
			Note:                 func() *string { s := "Top up dana darurat"; return &s }(),
		},
	)

	// Investment transfers (3x)
	for i := 0; i < 3; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:                 "transfer",
			Date:                 startDate.AddDate(0, i, 25),
			Amount:               1000000,
			AccountID:            accountMap["Tabungan Mandiri"],
			CategoryID:           categoryMap["Transfer"],
			DestinationAccountID: func() *int64 { id := accountMap["Tabungan Darurat"]; return &id }(),
			Note:                 func() *string { s := "Investasi bulanan"; return &s }(),
		})
	}

	// Map tags to transaction patterns (simplified - just tag a subset)
	var transactionIDs []int64
	for idx, tx := range transactions {
		transaction, err := rootSvc.Tsct.Create(ctx, tx)
		if err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}

		transactionIDs = append(transactionIDs, transaction.ID)
		slog.Info("Created transaction", "id", transaction.ID, "type", transaction.Type, "amount", transaction.Amount)

		// Add tags to specific transaction types (simple pattern-based)
		var tags []int64
		if tx.Note != nil {
			noteText := *tx.Note
			// Recurring tags - monthly salaries, bills, weekly groceries
			if len(noteText) >= 4 && (noteText[:4] == "Gaji" || noteText[:7] == "Tagihan" || noteText[:7] == "Belanja") {
				tags = append(tags, tagMap["berulang"])
			}
			// Online tags - e-wallet, online purchases
			if len(noteText) >= 6 && (noteText[:6] == "GoRide" || noteText[:6] == "Top up" || noteText[:4] == "Beli") {
				tags = append(tags, tagMap["online"])
			}
			// Important tags - bills, doctor
			if len(noteText) >= 7 && (noteText[:7] == "Tagihan" || noteText[:7] == "Kontrol" || noteText[:4] == "Beli" && len(noteText) > 8 && noteText[5:9] == "obat") {
				tags = append(tags, tagMap["penting"])
			}
			// Business tags - projects
			if len(noteText) >= 6 && (noteText[:6] == "Proyek" || noteText[:10] == "Konsultasi") {
				tags = append(tags, tagMap["bisnis"])
			}
			// Personal tags - cinema, coffee, games
			if len(noteText) >= 5 && (noteText[:5] == "Tiket" || noteText[:4] == "Kopi" || noteText[:4] == "game") {
				tags = append(tags, tagMap["pribadi"])
			}
			// Investment tags
			if len(noteText) >= 9 && noteText[:9] == "Investasi" {
				tags = append(tags, tagMap["investasi"])
			}
			// Emergency tags
			if len(noteText) >= 4 && noteText[:4] == "dana" || (len(noteText) >= 6 && noteText[:6] == "Top up" && len(noteText) > 10) {
				if len(noteText) >= 11 && noteText[len(noteText)-7:] == "darurat" {
					tags = append(tags, tagMap["darurat"])
				}
			}
		}

		// Add tags
		for _, tagID := range tags {
			_, err := rootSvc.TsctTag.Create(ctx, models.CreateTransactionTagModel{
				TransactionID: transaction.ID,
				TagID:         tagID,
			})
			if err != nil {
				return fmt.Errorf("failed to add tag to transaction %d: %w", transaction.ID, err)
			}
		}

		// Log progress every 20 transactions
		if (idx+1)%20 == 0 {
			slog.Info("Transaction creation progress", "completed", idx+1, "total", len(transactions))
		}
	}

	slog.Info("Created transactions", "count", len(transactionIDs))

	// Seed budget templates - will automatically generate budgets
	budgetTemplates := []models.CreateBudgetTemplateModel{
		// Account-level templates
		{
			AccountID:   func() *int64 { id := accountMap["Dompet Utama"]; return &id }(),
			AmountLimit: 2500000, // 2.5 million IDR monthly
			Recurrence:  "monthly",
			StartDate:   startDate, // 90 days ago
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Dompet Utama",
			Note:        func() *string { s := "Budget pengeluaran bulanan dari dompet utama"; return &s }(),
			Active:      true,
		},
		{
			AccountID:   func() *int64 { id := accountMap["Kartu Kredit BCA"]; return &id }(),
			AmountLimit: 5000000, // 5 million IDR monthly credit limit
			Recurrence:  "monthly",
			StartDate:   startDate,
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Kartu Kredit BCA",
			Note:        func() *string { s := "Batas maksimal penggunaan kartu kredit bulanan"; return &s }(),
			Active:      true,
		},
		// Category-level templates
		{
			CategoryID:  func() *int64 { id := categoryMap["Makanan & Minuman"]; return &id }(),
			AmountLimit: 500000, // 500k IDR weekly
			Recurrence:  "weekly",
			StartDate:   startDate,
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Makanan Mingguan",
			Note:        func() *string { s := "Budget mingguan untuk makanan dan minuman"; return &s }(),
			Active:      true,
		},
		{
			CategoryID:  func() *int64 { id := categoryMap["Transportasi"]; return &id }(),
			AmountLimit: 300000, // 300k IDR weekly
			Recurrence:  "weekly",
			StartDate:   startDate,
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Transportasi Mingguan",
			Note:        func() *string { s := "Budget mingguan untuk transportasi"; return &s }(),
			Active:      true,
		},
		{
			CategoryID:  func() *int64 { id := categoryMap["Hiburan"]; return &id }(),
			AmountLimit: 800000, // 800k IDR monthly
			Recurrence:  "monthly",
			StartDate:   startDate.AddDate(0, 0, 30), // Started 60 days ago
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Hiburan Bulanan",
			Note:        func() *string { s := "Budget bulanan untuk hiburan dan rekreasi"; return &s }(),
			Active:      true,
		},
		{
			CategoryID:  func() *int64 { id := categoryMap["Belanja Online"]; return &id }(),
			AmountLimit: 1500000, // 1.5 million IDR monthly
			Recurrence:  "monthly",
			StartDate:   startDate.AddDate(0, 0, 45), // Started 45 days ago
			EndDate:     func() *time.Time { t := time.Now().AddDate(0, 6, 0); return &t }(),
			Name:        "Budget Belanja Online",
			Note:        func() *string { s := "Budget bulanan untuk belanja online"; return &s }(),
			Active:      true,
		},
	}

	var budgetTemplateIDs []int64
	for _, template := range budgetTemplates {
		templateModel, err := rootSvc.BudgTem.Create(ctx, template)
		if err != nil {
			return fmt.Errorf("failed to create budget template %s: %w", template.Name, err)
		}
		budgetTemplateIDs = append(budgetTemplateIDs, templateModel.ID)
		slog.Info("Created budget template", "id", templateModel.ID, "name", templateModel.Name)
	}

	slog.Info("Budget templates will auto-generate budgets for their recurrence periods")

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
			StartDate:  startDate,                                                            // Started 90 days ago
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
			StartDate:  startDate,
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
			StartDate:  startDate,
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
			StartDate:  startDate,
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
			StartDate:  startDate.AddDate(0, 0, 80),                                          // Started 10 days ago
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
