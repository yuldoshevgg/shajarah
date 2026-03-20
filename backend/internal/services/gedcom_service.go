package services

import (
	"bufio"
	"context"
	"fmt"
	"strings"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"

	"github.com/google/uuid"
)

// GEDCOMService handles import and export of GEDCOM 5.5 files.
type GEDCOMService struct{}

func NewGEDCOMService() *GEDCOMService { return &GEDCOMService{} }

// ---- Import ----------------------------------------------------------------

type gedcomRecord struct {
	tag      string
	value    string
	children []*gedcomRecord
}

// parseGEDCOM parses raw GEDCOM text into a flat list of top-level records.
func parseGEDCOM(content string) []*gedcomRecord {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var stack []*gedcomRecord
	var roots []*gedcomRecord

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, " ", 3)
		if len(parts) < 2 {
			continue
		}
		level := parts[0]
		rest := parts[1:]

		rec := &gedcomRecord{}
		// Level-0 lines may be: "0 @I1@ INDI" or "0 HEAD"
		if len(rest) == 2 {
			if strings.HasPrefix(rest[0], "@") {
				rec.tag = rest[1] + ":" + rest[0] // e.g. "INDI:@I1@"
			} else {
				rec.tag = rest[0]
				rec.value = rest[1]
			}
		} else {
			rec.tag = rest[0]
		}
		if len(parts) == 3 && !strings.HasPrefix(parts[1], "@") {
			rec.value = parts[2]
		}

		lvl := 0
		fmt.Sscanf(level, "%d", &lvl)

		if lvl == 0 {
			roots = append(roots, rec)
			stack = []*gedcomRecord{rec}
		} else {
			for len(stack) > lvl {
				stack = stack[:len(stack)-1]
			}
			parent := stack[len(stack)-1]
			parent.children = append(parent.children, rec)
			stack = append(stack, rec)
		}
	}
	return roots
}

func childValue(rec *gedcomRecord, tag string) string {
	for _, c := range rec.children {
		if c.tag == tag {
			return c.value
		}
	}
	return ""
}

// ImportGEDCOM parses a GEDCOM string, creates persons + parent-child relationships,
// and inserts them into the given family.
func (s *GEDCOMService) ImportGEDCOM(ctx context.Context, familyID, content string) (int, int, error) {
	records := parseGEDCOM(content)

	// Maps gedcom XREFs to DB UUIDs.
	personIDs := map[string]string{}

	tx, err := database.DB.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	personsCreated := 0
	relsCreated := 0

	// First pass: create persons from INDI records.
	for _, rec := range records {
		if !strings.HasPrefix(rec.tag, "INDI:") {
			continue
		}
		xref := strings.TrimPrefix(rec.tag, "INDI:")
		xref = strings.Trim(xref, "@")

		// Name
		nameTag := childValue(rec, "NAME")
		firstName, lastName := parseName(nameTag)

		// Sex
		gender := strings.ToLower(childValue(rec, "SEX"))
		if gender == "m" {
			gender = "male"
		} else if gender == "f" {
			gender = "female"
		}

		// Birth date
		var birthDate *string
		for _, c := range rec.children {
			if c.tag == "BIRT" {
				d := childValue(c, "DATE")
				if d != "" {
					parsed := parseGEDCOMDate(d)
					if parsed != "" {
						birthDate = &parsed
					}
				}
			}
		}

		id := uuid.New().String()
		personIDs[xref] = id

		_, err := tx.Exec(ctx,
			`INSERT INTO persons (id, family_id, first_name, last_name, gender, birth_date)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			id, familyID, firstName, lastName, gender, birthDate,
		)
		if err != nil {
			return 0, 0, err
		}
		personsCreated++
	}

	// Second pass: create parent-child relationships from FAM records.
	for _, rec := range records {
		if !strings.HasPrefix(rec.tag, "FAM:") {
			continue
		}

		husbRef := strings.Trim(childValue(rec, "HUSB"), "@")
		wifeRef := strings.Trim(childValue(rec, "WIFE"), "@")

		// Spouse relationship
		husbID := personIDs[husbRef]
		wifeID := personIDs[wifeRef]
		if husbID != "" && wifeID != "" {
			_, err := tx.Exec(ctx,
				`INSERT INTO relationships (id, person1_id, person2_id, relation_type)
				 VALUES ($1, $2, $3, 'spouse')
				 ON CONFLICT DO NOTHING`,
				uuid.New().String(), husbID, wifeID,
			)
			if err == nil {
				relsCreated++
			}
		}

		// Child relationships
		for _, c := range rec.children {
			if c.tag != "CHIL" {
				continue
			}
			childRef := strings.Trim(c.value, "@")
			childID := personIDs[childRef]

			if husbID != "" && childID != "" {
				tx.Exec(ctx,
					`INSERT INTO relationships (id, person1_id, person2_id, relation_type)
					 VALUES ($1, $2, $3, 'parent')
					 ON CONFLICT DO NOTHING`,
					uuid.New().String(), husbID, childID,
				)
				relsCreated++
			}
			if wifeID != "" && childID != "" {
				tx.Exec(ctx,
					`INSERT INTO relationships (id, person1_id, person2_id, relation_type)
					 VALUES ($1, $2, $3, 'parent')
					 ON CONFLICT DO NOTHING`,
					uuid.New().String(), wifeID, childID,
				)
				relsCreated++
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}
	return personsCreated, relsCreated, nil
}

func parseName(name string) (string, string) {
	// GEDCOM name format: "Given /Surname/"
	name = strings.TrimSpace(name)
	if idx := strings.Index(name, "/"); idx != -1 {
		given := strings.TrimSpace(name[:idx])
		rest := name[idx:]
		end := strings.LastIndex(rest, "/")
		surname := ""
		if end > 0 {
			surname = strings.TrimSpace(rest[1:end])
		}
		return given, surname
	}
	parts := strings.Fields(name)
	if len(parts) == 0 {
		return "Unknown", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// parseGEDCOMDate converts GEDCOM date strings like "12 JAN 1950" to "1950-01-12".
func parseGEDCOMDate(s string) string {
	months := map[string]string{
		"JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
		"MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
		"SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
	}
	parts := strings.Fields(strings.ToUpper(s))
	switch len(parts) {
	case 1: // just year
		return parts[0] + "-01-01"
	case 2: // MON YEAR
		if m, ok := months[parts[0]]; ok {
			return parts[1] + "-" + m + "-01"
		}
	case 3: // DAY MON YEAR
		if m, ok := months[parts[1]]; ok {
			return parts[2] + "-" + m + "-" + fmt.Sprintf("%02s", parts[0])
		}
	}
	return ""
}

// ---- Export ----------------------------------------------------------------

func (s *GEDCOMService) ExportGEDCOM(ctx context.Context, family *models.Family, persons []models.Person, rels []models.Relationship) string {
	var b strings.Builder

	now := time.Now().Format("2 Jan 2006")

	// Header
	b.WriteString("0 HEAD\n")
	b.WriteString("1 SOUR Shajarah\n")
	b.WriteString("2 NAME Shajarah Genealogy\n")
	b.WriteString("1 GEDC\n")
	b.WriteString("2 VERS 5.5\n")
	b.WriteString("2 FORM LINEAGE-LINKED\n")
	b.WriteString("1 CHAR UTF-8\n")
	b.WriteString("1 DATE " + now + "\n")
	b.WriteString("1 FILE " + family.Name + ".ged\n")
	b.WriteString("0 @SUBM@ SUBM\n")
	b.WriteString("1 NAME Shajarah\n")

	// Index persons by ID for quick lookup.
	xref := map[string]string{}
	for i, p := range persons {
		xref[p.ID] = fmt.Sprintf("I%d", i+1)
	}

	// INDI records
	for _, p := range persons {
		tag := xref[p.ID]
		b.WriteString(fmt.Sprintf("0 @%s@ INDI\n", tag))

		name := p.FirstName
		if p.LastName != "" {
			name += " /" + p.LastName + "/"
		}
		b.WriteString("1 NAME " + name + "\n")

		gender := "U"
		if p.Gender == "male" {
			gender = "M"
		} else if p.Gender == "female" {
			gender = "F"
		}
		b.WriteString("1 SEX " + gender + "\n")

		if p.BirthDate != nil && !p.BirthDate.IsZero() {
			b.WriteString("1 BIRT\n")
			b.WriteString("2 DATE " + formatGEDCOMDate(p.BirthDate.Format("2006-01-02")) + "\n")
		}
		if p.DeathDate != nil && !p.DeathDate.IsZero() {
			b.WriteString("1 DEAT\n")
			b.WriteString("2 DATE " + formatGEDCOMDate(p.DeathDate.Format("2006-01-02")) + "\n")
		}
	}

	// FAM records — one per spouse pair
	type famKey struct{ h, w string }
	families := map[famKey][]string{} // key → child IDs
	spouseXref := map[famKey]string{}
	famIdx := 1

	for _, r := range rels {
		if r.RelationType == "spouse" {
			k := famKey{r.Person1ID, r.Person2ID}
			if _, exists := spouseXref[k]; !exists {
				spouseXref[k] = fmt.Sprintf("F%d", famIdx)
				famIdx++
			}
		}
	}
	for _, r := range rels {
		if r.RelationType == "parent" {
			// person1 is parent, person2 is child — find their fam
			parentID := r.Person1ID
			childID := r.Person2ID
			// Try to find a fam record this parent belongs to
			found := false
			for k := range spouseXref {
				if k.h == parentID || k.w == parentID {
					families[k] = append(families[k], childID)
					found = true
					break
				}
			}
			if !found {
				// Parent without spouse — create a solo fam
				k := famKey{parentID, ""}
				if _, exists := spouseXref[k]; !exists {
					spouseXref[k] = fmt.Sprintf("F%d", famIdx)
					famIdx++
				}
				families[k] = append(families[k], childID)
			}
		}
	}

	for k, famTag := range spouseXref {
		b.WriteString(fmt.Sprintf("0 @%s@ FAM\n", famTag))
		if x, ok := xref[k.h]; ok {
			b.WriteString(fmt.Sprintf("1 HUSB @%s@\n", x))
		}
		if k.w != "" {
			if x, ok := xref[k.w]; ok {
				b.WriteString(fmt.Sprintf("1 WIFE @%s@\n", x))
			}
		}
		for _, cid := range families[k] {
			if x, ok := xref[cid]; ok {
				b.WriteString(fmt.Sprintf("1 CHIL @%s@\n", x))
			}
		}
	}

	b.WriteString("0 TRLR\n")
	return b.String()
}

func formatGEDCOMDate(iso string) string {
	months := []string{"", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"}
	t, err := time.Parse("2006-01-02", iso)
	if err != nil {
		return iso
	}
	return fmt.Sprintf("%d %s %d", t.Day(), months[t.Month()], t.Year())
}
