package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type PersonRepository struct{}

func NewPersonRepository() *PersonRepository {
	return &PersonRepository{}
}

func (r *PersonRepository) CreatePerson(ctx context.Context, p *models.Person) error {
	query := `
	INSERT INTO persons (id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`
	_, err := database.DB.Exec(ctx, query,
		p.ID, p.FamilyID, p.Email, p.FirstName, p.LastName, p.Gender, p.BirthDate, p.Biography, p.Visibility,
	)
	return err
}

func (r *PersonRepository) GetPersons(ctx context.Context, familyID string) ([]models.Person, error) {
	query := `
	SELECT id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility, created_at
	FROM persons
	WHERE family_id=$1
	`
	rows, err := database.DB.Query(ctx, query, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []models.Person
	for rows.Next() {
		var p models.Person
		if err := rows.Scan(&p.ID, &p.FamilyID, &p.Email, &p.FirstName, &p.LastName, &p.Gender, &p.BirthDate, &p.Biography, &p.Visibility, &p.CreatedAt); err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}
	return persons, nil
}

func (r *PersonRepository) GetPersonByID(ctx context.Context, id string) (*models.Person, error) {
	query := `
	SELECT id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility, created_at
	FROM persons
	WHERE id=$1
	`
	var p models.Person
	err := database.DB.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.FamilyID, &p.Email, &p.FirstName, &p.LastName, &p.Gender, &p.BirthDate, &p.Biography, &p.Visibility, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PersonRepository) GetPersonByEmail(ctx context.Context, email string) (*models.Person, error) {
	query := `
	SELECT id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility, created_at
	FROM persons
	WHERE email=$1
	`
	var p models.Person
	err := database.DB.QueryRow(ctx, query, email).Scan(
		&p.ID, &p.FamilyID, &p.Email, &p.FirstName, &p.LastName, &p.Gender, &p.BirthDate, &p.Biography, &p.Visibility, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PersonRepository) UpdatePerson(ctx context.Context, p *models.Person) error {
	query := `
	UPDATE persons
	SET email = $1, first_name = $2, last_name = $3, gender = $4, birth_date = $5, biography = $6, visibility = $7
	WHERE id = $8
	`
	_, err := database.DB.Exec(ctx, query,
		p.Email, p.FirstName, p.LastName, p.Gender, p.BirthDate, p.Biography, p.Visibility, p.ID,
	)
	return err
}

func (r *PersonRepository) UpdatePersonVisibility(ctx context.Context, personID, visibility string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE persons SET visibility = $1 WHERE id = $2`,
		visibility, personID,
	)
	return err
}

func (r *PersonRepository) SetPersonEmail(ctx context.Context, personID, email string) error {
	_, err := database.DB.Exec(ctx, `UPDATE persons SET email = $1 WHERE id = $2 AND email IS NULL`, email, personID)
	return err
}

func (r *PersonRepository) DeletePerson(ctx context.Context, id string) error {
	_, err := database.DB.Exec(ctx, `DELETE FROM persons WHERE id=$1`, id)
	return err
}

func (r *PersonRepository) SearchPersons(ctx context.Context, q string) ([]models.Person, error) {
	query := `
	SELECT id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility, created_at
	FROM persons
	WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR biography ILIKE $1)
	  AND visibility = 'public'
	ORDER BY first_name, last_name
	LIMIT 50
	`
	rows, err := database.DB.Query(ctx, query, "%"+q+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []models.Person
	for rows.Next() {
		var p models.Person
		if err := rows.Scan(&p.ID, &p.FamilyID, &p.Email, &p.FirstName, &p.LastName, &p.Gender, &p.BirthDate, &p.Biography, &p.Visibility, &p.CreatedAt); err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}
	return persons, nil
}

func (r *PersonRepository) MergePersons(ctx context.Context, keepID, removeID string) error {
	tx, err := database.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	stmts := []string{
		`UPDATE relationships SET person1_id = $1 WHERE person1_id = $2`,
		`UPDATE relationships SET person2_id = $1 WHERE person2_id = $2`,
		`DELETE FROM relationships WHERE person1_id = person2_id`,
		`UPDATE photos SET person_id = $1 WHERE person_id = $2`,
		`UPDATE stories SET person_id = $1 WHERE person_id = $2`,
		`UPDATE events SET person_id = $1 WHERE person_id = $2`,
		`UPDATE user_person_links SET person_id = $1 WHERE person_id = $2`,
		`DELETE FROM persons WHERE id = $2`,
	}

	for _, stmt := range stmts {
		if _, err := tx.Exec(ctx, stmt, keepID, removeID); err != nil {
			return err
		}
	}

	_, err = tx.Exec(ctx, `
		DELETE FROM relationships
		WHERE id NOT IN (
			SELECT MIN(id::text)::uuid
			FROM relationships
			GROUP BY LEAST(person1_id::text, person2_id::text),
			         GREATEST(person1_id::text, person2_id::text),
			         relation_type
		)
	`)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PersonRepository) UpdatePersonFamilyID(ctx context.Context, personID, familyID string) error {
	_, err := database.DB.Exec(ctx, `UPDATE persons SET family_id = $1 WHERE id = $2`, familyID, personID)
	return err
}

func (r *PersonRepository) FindDuplicatesInFamily(ctx context.Context, familyID string) ([]models.Person, error) {
	query := `
	SELECT id, family_id, email, first_name, last_name, gender, birth_date, biography, visibility, created_at
	FROM persons
	WHERE family_id = $1
	  AND (first_name, coalesce(last_name, '')) IN (
	    SELECT first_name, coalesce(last_name, '')
	    FROM persons
	    WHERE family_id = $1
	    GROUP BY first_name, coalesce(last_name, '')
	    HAVING COUNT(*) > 1
	  )
	ORDER BY first_name, last_name
	`
	rows, err := database.DB.Query(ctx, query, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []models.Person
	for rows.Next() {
		var p models.Person
		if err := rows.Scan(&p.ID, &p.FamilyID, &p.Email, &p.FirstName, &p.LastName, &p.Gender, &p.BirthDate, &p.Biography, &p.Visibility, &p.CreatedAt); err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}
	return persons, nil
}
