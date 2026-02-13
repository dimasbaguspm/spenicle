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
	// User is based in Yogyakarta, Indonesia
	startDate := time.Now().AddDate(0, 0, -90)
	var transactions []models.CreateTransactionModel

	// Helper functions for coordinates
	ptr := func(v float64) *float64 { return &v }

	// Yogyakarta location coordinates
	type Location struct {
		Name string
		Lat  float64
		Lon  float64
	}

	yogyaLocations := []Location{
		{"Kantor PT Maju Jaya (Sleman)", -7.770910, 110.377533}, // Near UGM
		{"Malioboro Street", -7.792786, 110.365463},             // Shopping area
		{"Jogja City Mall", -7.781898, 110.378433},              // Mall
		{"Hartono Mall", -7.752947, 110.409752},                 // Mall
		{"Beringharjo Market", -7.798481, 110.365128},           // Traditional market
		{"Warung Makan Gudeg Yu Djum", -7.797523, 110.364584},   // Famous restaurant
		{"Kopi Klotok Pakem", -7.669235, 110.418729},            // Coffee shop north
		{"Angkringan Tugu", -7.789423, 110.363847},              // Street food
		{"Mirota Kampus Supermarket", -7.782014, 110.364882},    // Supermarket
		{"Alfamart Gejayan", -7.776441, 110.380022},             // Convenience store
		{"Indomaret Seturan", -7.750389, 110.408694},            // Convenience store
		{"SPBU Pertamina Gejayan", -7.776904, 110.379234},       // Gas station
		{"SPBU Shell Ringroad", -7.757211, 110.409183},          // Gas station
		{"RS Sardjito", -7.768611, 110.373583},                  // Hospital
		{"Apotek K24 Kaliurang", -7.768230, 110.400841},         // Pharmacy
		{"Gramedia Ambarukmo Plaza", -7.781667, 110.401472},     // Bookstore
		{"Bioskop XXI Ambarukmo", -7.781563, 110.401328},        // Cinema
		{"GoWork Jogja", -7.782452, 110.378011},                 // Coworking space
		{"Bakpia Pathok 25", -7.801234, 110.366789},             // Souvenir shop
		{"Warung Makan Soto Kadipiro", -7.771234, 110.381567},   // Local restaurant
		{"Cafe Roaster and Bear", -7.787654, 110.368321},        // Cafe
		{"Jogja Expo Center", -7.746891, 110.416234},            // Convention center
		{"Prambanan Temple Area", -7.752020, 110.491474},        // Tourist area
		{"Terminal Giwangan", -7.826123, 110.390456},            // Bus terminal
		{"Stasiun Lempuyangan", -7.784567, 110.375123},          // Train station
	}

	// Monthly income - 3 months (salary received at office/bank)
	for i := 0; i < 3; i++ {
		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, i, 5),
			Amount:     8500000, // 8.5 million IDR monthly salary
			AccountID:  accountMap["Rekening Gaji"],
			CategoryID: categoryMap["Gaji"],
			Latitude:   ptr(yogyaLocations[0].Lat), // Office location
			Longitude:  ptr(yogyaLocations[0].Lon),
			Note:       func() *string { s := fmt.Sprintf("Gaji bulan ke-%d", i+1); return &s }(),
		})
	}

	// Freelance income - sporadic (coworking space)
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, 0, 15),
			Amount:     3200000, // 3.2 million IDR for website project
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Latitude:   ptr(yogyaLocations[17].Lat), // GoWork Jogja
			Longitude:  ptr(yogyaLocations[17].Lon),
			Note:       func() *string { s := "Proyek website perusahaan e-commerce"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, 1, 20),
			Amount:     4500000, // 4.5 million IDR for database consulting
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Latitude:   ptr(yogyaLocations[17].Lat), // GoWork Jogja
			Longitude:  ptr(yogyaLocations[17].Lon),
			Note:       func() *string { s := "Konsultasi sistem database PostgreSQL"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "income",
			Date:       startDate.AddDate(0, 2, 12),
			Amount:     2800000, // 2.8 million IDR for mobile app
			AccountID:  accountMap["Tabungan Mandiri"],
			CategoryID: categoryMap["Freelance"],
			Latitude:   ptr(yogyaLocations[17].Lat), // GoWork Jogja
			Longitude:  ptr(yogyaLocations[17].Lon),
			Note:       func() *string { s := "Desain UI/UX aplikasi mobile"; return &s }(),
		},
	)

	// Bonus income
	transactions = append(transactions, models.CreateTransactionModel{
		Type:       "income",
		Date:       startDate.AddDate(0, 0, 10),
		Amount:     2500000, // 2.5 million IDR year-end bonus
		AccountID:  accountMap["Tabungan Darurat"],
		CategoryID: categoryMap["Bonus"],
		Latitude:   ptr(yogyaLocations[0].Lat), // Office
		Longitude:  ptr(yogyaLocations[0].Lon),
		Note:       func() *string { s := "Bonus akhir tahun dari perusahaan"; return &s }(),
	})

	// Weekly groceries - ~13 weeks over 3 months (rotating between supermarket and traditional market)
	for i := 0; i < 13; i++ {
		var loc Location
		var note string
		var amount int64

		if i%2 == 0 {
			loc = yogyaLocations[8] // Mirota Kampus Supermarket
			note = fmt.Sprintf("Belanja mingguan supermarket #%d", i+1)
			amount = 280000 + int64((i%3)*70000) // 280k-420k IDR
		} else {
			loc = yogyaLocations[4] // Beringharjo Market
			note = fmt.Sprintf("Belanja pasar tradisional #%d", i+1)
			amount = 220000 + int64((i%4)*50000) // 220k-370k IDR
		}

		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*7+2),
			Amount:     amount,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Latitude:   ptr(loc.Lat),
			Longitude:  ptr(loc.Lon),
			Note:       func() *string { s := note; return &s }(),
		})
	}

	// Monthly bills - 3 months each for electricity, internet, phone, water
	// Bills paid at convenience stores (Alfamart/Indomaret)
	for i := 0; i < 3; i++ {
		convStore := yogyaLocations[9] // Alfamart
		if i%2 == 1 {
			convStore = yogyaLocations[10] // Indomaret
		}

		transactions = append(transactions,
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 12),
				Amount:     520000, // 520k IDR electricity (AC usage in Java heat)
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Latitude:   ptr(convStore.Lat),
				Longitude:  ptr(convStore.Lon),
				Note:       func() *string { s := fmt.Sprintf("Tagihan listrik PLN bulan ke-%d", i+1); return &s }(),
			},
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 15),
				Amount:     385000, // 385k IDR internet (50 Mbps Indihome)
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Latitude:   ptr(convStore.Lat),
				Longitude:  ptr(convStore.Lon),
				Note:       func() *string { s := fmt.Sprintf("Tagihan internet Indihome bulan ke-%d", i+1); return &s }(),
			},
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 18),
				Amount:     150000, // 150k IDR phone (Telkomsel Halo)
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Latitude:   ptr(convStore.Lat),
				Longitude:  ptr(convStore.Lon),
				Note:       func() *string { s := fmt.Sprintf("Tagihan Telkomsel Halo bulan ke-%d", i+1); return &s }(),
			},
			models.CreateTransactionModel{
				Type:       "expense",
				Date:       startDate.AddDate(0, i, 20),
				Amount:     85000, // 85k IDR water bill (PDAM)
				AccountID:  accountMap["Dompet Utama"],
				CategoryID: categoryMap["Tagihan"],
				Latitude:   ptr(convStore.Lat),
				Longitude:  ptr(convStore.Lon),
				Note:       func() *string { s := fmt.Sprintf("Tagihan air PDAM bulan ke-%d", i+1); return &s }(),
			},
		)
	}

	// Fuel/transport - biweekly over 3 months (~6 times)
	for i := 0; i < 6; i++ {
		// Fuel - alternating between gas stations
		gasStation := yogyaLocations[11] // SPBU Pertamina
		if i%2 == 1 {
			gasStation = yogyaLocations[12] // SPBU Shell
		}

		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*14+3),
			Amount:     180000, // 180k IDR fuel (Pertalite ~12 liters)
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Transportasi"],
			Latitude:   ptr(gasStation.Lat),
			Longitude:  ptr(gasStation.Lon),
			Note:       func() *string { s := "Isi bensin Pertalite motor"; return &s }(),
		})

		// GoRide/GoCar - various pickup locations
		pickupLocations := []Location{
			yogyaLocations[24], // Train station
			yogyaLocations[2],  // Mall
			yogyaLocations[0],  // Office
		}
		pickup := pickupLocations[i%3]

		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*14+8),
			Amount:     25000 + int64((i%4)*8000), // 25k-49k IDR
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Transportasi"],
			Latitude:   ptr(pickup.Lat),
			Longitude:  ptr(pickup.Lon),
			Note:       func() *string { s := "GoRide perjalanan dalam kota"; return &s }(),
		})
	}

	// Additional transportation - intercity travel, parking, etc.
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 14),
			Amount:     150000, // Bus to Solo
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Transportasi"],
			Latitude:   ptr(yogyaLocations[23].Lat), // Terminal Giwangan
			Longitude:  ptr(yogyaLocations[23].Lon),
			Note:       func() *string { s := "Bus Yogya-Solo PP"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 7),
			Amount:     95000, // Train ticket
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Transportasi"],
			Latitude:   ptr(yogyaLocations[24].Lat), // Stasiun Lempuyangan
			Longitude:  ptr(yogyaLocations[24].Lon),
			Note:       func() *string { s := "KA Prambanan Ekspres ke Solo"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 28),
			Amount:     15000, // Parking at mall
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Transportasi"],
			Latitude:   ptr(yogyaLocations[3].Lat), // Hartono Mall
			Longitude:  ptr(yogyaLocations[3].Lon),
			Note:       func() *string { s := "Parkir motor Hartono Mall"; return &s }(),
		},
	)

	// Coffee/snacks - frequent small purchases at various cafes and street food
	coffeeLocations := []Location{
		yogyaLocations[6],  // Kopi Klotok
		yogyaLocations[7],  // Angkringan Tugu
		yogyaLocations[20], // Cafe Roaster and Bear
		yogyaLocations[5],  // Gudeg Yu Djum
		yogyaLocations[19], // Warung Soto
	}

	for i := 0; i < 25; i++ {
		loc := coffeeLocations[i%len(coffeeLocations)]
		var note string
		var amount int64

		switch i % 5 {
		case 0:
			note = "Kopi susu + pisang goreng"
			amount = 28000
		case 1:
			note = "Angkringan malam (nasi kucing + wedang jahe)"
			amount = 22000
		case 2:
			note = "Lunch gudeg komplit"
			amount = 35000
		case 3:
			note = "Soto ayam + es teh manis"
			amount = 25000
		case 4:
			note = "Kopi latte + roti bakar"
			amount = 42000
		}

		transactions = append(transactions, models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, i*3+1),
			Amount:     amount,
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Latitude:   ptr(loc.Lat),
			Longitude:  ptr(loc.Lon),
			Note:       func() *string { s := note; return &s }(),
		})
	}

	// Restaurant meals - larger food purchases
	transactions = append(transactions,
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 16),
			Amount:     125000, // Dinner for 2
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Latitude:   ptr(-7.782345), // Restaurant in Jogja
			Longitude:  ptr(110.375678),
			Note:       func() *string { s := "Makan malam di restoran Jawa"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 22),
			Amount:     95000, // Lunch
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Latitude:   ptr(-7.756789), // Restaurant
			Longitude:  ptr(110.412345),
			Note:       func() *string { s := "Pesan GoFood ayam geprek + es jeruk"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 18),
			Amount:     165000, // Weekend brunch
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Makanan & Minuman"],
			Latitude:   ptr(yogyaLocations[2].Lat), // Jogja City Mall
			Longitude:  ptr(yogyaLocations[2].Lon),
			Note:       func() *string { s := "Brunch di kafe mall (pasta + coffee)"; return &s }(),
		},
	)

	// One-time expenses - shopping, doctor, entertainment, education
	transactions = append(transactions,
		// Shopping - mix of online and in-store
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 8),
			Amount:     650000, // Shoes at mall
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Latitude:   ptr(yogyaLocations[3].Lat), // Hartono Mall
			Longitude:  ptr(yogyaLocations[3].Lon),
			Note:       func() *string { s := "Sepatu olahraga Nike di Hartono Mall"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 5),
			Amount:     1250000, // Laptop accessories online (Tokopedia)
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Tokopedia: mouse wireless + keyboard mekanikal"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 10),
			Amount:     425000, // Programming books
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Latitude:   ptr(yogyaLocations[15].Lat), // Gramedia
			Longitude:  ptr(yogyaLocations[15].Lon),
			Note:       func() *string { s := "Buku Clean Code + Design Patterns di Gramedia"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 25),
			Amount:     3200000, // Monitor 27"
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Belanja Online"],
			Note:       func() *string { s := "Shopee: Monitor LG 27 inch 4K"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 35),
			Amount:     185000, // Batik shirt
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Belanja Online"],
			Latitude:   ptr(yogyaLocations[1].Lat), // Malioboro
			Longitude:  ptr(yogyaLocations[1].Lon),
			Note:       func() *string { s := "Batik kemeja di Malioboro"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 12),
			Amount:     95000, // Souvenirs
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Belanja Online"],
			Latitude:   ptr(yogyaLocations[18].Lat), // Bakpia Pathok
			Longitude:  ptr(yogyaLocations[18].Lon),
			Note:       func() *string { s := "Oleh-oleh bakpia untuk keluarga"; return &s }(),
		},

		// Healthcare
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 20),
			Amount:     350000, // Dentist
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Kesehatan"],
			Latitude:   ptr(yogyaLocations[13].Lat), // RS Sardjito
			Longitude:  ptr(yogyaLocations[13].Lon),
			Note:       func() *string { s := "Scaling gigi di klinik gigi RS Sardjito"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 25),
			Amount:     185000, // Medicine
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Kesehatan"],
			Latitude:   ptr(yogyaLocations[14].Lat), // Apotek K24
			Longitude:  ptr(yogyaLocations[14].Lon),
			Note:       func() *string { s := "Vitamin C + multivitamin di K24"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 8),
			Amount:     450000, // Medical checkup
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Kesehatan"],
			Latitude:   ptr(yogyaLocations[13].Lat), // RS Sardjito
			Longitude:  ptr(yogyaLocations[13].Lon),
			Note:       func() *string { s := "Medical checkup tahunan + lab"; return &s }(),
		},

		// Entertainment
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 22),
			Amount:     85000, // Cinema (2 tickets)
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Hiburan"],
			Latitude:   ptr(yogyaLocations[16].Lat), // XXI Ambarukmo
			Longitude:  ptr(yogyaLocations[16].Lon),
			Note:       func() *string { s := "Tiket bioskop XXI Ambarukmo (2 orang)"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 18),
			Amount:     120000, // Mobile game top-up
			AccountID:  accountMap["Dompet Digital GoPay"],
			CategoryID: categoryMap["Hiburan"],
			Note:       func() *string { s := "Top up Mobile Legends diamonds"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 15),
			Amount:     750000, // Concert
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Hiburan"],
			Latitude:   ptr(yogyaLocations[21].Lat), // Jogja Expo Center
			Longitude:  ptr(yogyaLocations[21].Lon),
			Note:       func() *string { s := "Tiket konser musik indie di JEC (2 tiket)"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 3),
			Amount:     125000, // Weekend trip
			AccountID:  accountMap["Dompet Utama"],
			CategoryID: categoryMap["Hiburan"],
			Latitude:   ptr(yogyaLocations[22].Lat), // Prambanan
			Longitude:  ptr(yogyaLocations[22].Lon),
			Note:       func() *string { s := "Tiket masuk Candi Prambanan"; return &s }(),
		},

		// Education
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 0, 18),
			Amount:     850000, // Online course
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Pendidikan"],
			Note:       func() *string { s := "Udemy course: Advanced React & TypeScript"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 1, 9),
			Amount:     1500000, // Workshop
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Pendidikan"],
			Latitude:   ptr(yogyaLocations[17].Lat), // GoWork
			Longitude:  ptr(yogyaLocations[17].Lon),
			Note:       func() *string { s := "Workshop fullstack development 2 hari"; return &s }(),
		},
		models.CreateTransactionModel{
			Type:       "expense",
			Date:       startDate.AddDate(0, 2, 21),
			Amount:     325000, // Books
			AccountID:  accountMap["Kartu Kredit BCA"],
			CategoryID: categoryMap["Pendidikan"],
			Latitude:   ptr(yogyaLocations[15].Lat), // Gramedia
			Longitude:  ptr(yogyaLocations[15].Lon),
			Note:       func() *string { s := "Buku sistem design + database fundamentals"; return &s }(),
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
