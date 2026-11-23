package uat

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"slices"
	"strings"
)

type manifestEntry struct {
	Name string `json:"name"`
	Rows int    `json:"rows"`
}

type manifestReport struct {
	Files []manifestEntry `json:"files"`
}

func (w *world) exportArchive() (*zip.Reader, error) {
	reader, err := zip.NewReader(bytes.NewReader(w.body), int64(len(w.body)))
	if err != nil {
		return nil, fmt.Errorf("the export is not a zip archive (%q): %w", preview(string(w.body)), err)
	}

	return reader, nil
}

func (w *world) exportArchiveHolds(want string) error {
	reader, err := w.exportArchive()
	if err != nil {
		return err
	}

	names := make([]string, 0, len(reader.File))

	for _, file := range reader.File {
		names = append(names, file.Name)
	}

	expected := make([]string, 0)

	for _, name := range strings.Split(want, ",") {
		if trimmed := strings.TrimSpace(name); trimmed != "" {
			expected = append(expected, trimmed)
		}
	}

	if !slices.Equal(names, expected) {
		return fmt.Errorf("the archive holds %v, want %v", names, expected)
	}

	return nil
}

func (w *world) exportManifestRows(name string) (int, error) {
	reader, err := w.exportArchive()
	if err != nil {
		return 0, err
	}

	for _, file := range reader.File {
		if file.Name != "manifest.json" {
			continue
		}

		manifest, readErr := readManifest(file)
		if readErr != nil {
			return 0, readErr
		}

		for _, entry := range manifest.Files {
			if entry.Name == name {
				return entry.Rows, nil
			}
		}

		return 0, fmt.Errorf("the manifest does not report %q", name)
	}

	return 0, errors.New("the archive holds no manifest.json")
}

func readManifest(file *zip.File) (manifestReport, error) {
	body, err := file.Open()
	if err != nil {
		return manifestReport{}, fmt.Errorf("open manifest: %w", err)
	}

	defer func() { _ = body.Close() }()

	var report manifestReport

	if err := json.NewDecoder(body).Decode(&report); err != nil {
		return manifestReport{}, fmt.Errorf("decode manifest: %w", err)
	}

	return report, nil
}

func (w *world) assertExportSnapshot(name string) error {
	var document any
	if err := json.Unmarshal(w.body, &document); err != nil {
		return fmt.Errorf("the export is not JSON (%q): %w", preview(string(w.body)), err)
	}

	if err := walkContract("$", document); err != nil {
		return err
	}

	return compareSnapshot(filepath.Join(snapshotRoot, "api", name+".json"),
		sortedArrays(normalise(document)))
}

func (w *world) assertExportSummarySnapshot(name string) error {
	value, err := w.exportSummary()
	if err != nil {
		return err
	}

	if err := walkContract("$.summary", value); err != nil {
		return err
	}

	return compareSnapshot(filepath.Join(snapshotRoot, "api", name+".json"),
		sortedArrays(normalise(value)))
}
