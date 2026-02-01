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

	for _, txWithTags := range transactionTags {
		transaction, err := rootSvc.Tsct.Create(ctx, txWithTags.Transaction)
		if err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}

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

	slog.Info("Development data seeding completed successfully")
	return nil
}
