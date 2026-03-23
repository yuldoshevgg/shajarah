package handlers

import (
	"net/http"
	"sort"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EventHandler struct {
	repo *repository.EventRepository
}

func NewEventHandler(repo *repository.EventRepository) *EventHandler {
	return &EventHandler{repo: repo}
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req models.CreateEventRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event := models.Event{
		ID:          uuid.New().String(),
		PersonID:    req.PersonID,
		EventType:   req.EventType,
		Description: req.Description,
	}

	if req.EventDate != "" {
		t, err := time.Parse("2006-01-02", req.EventDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event_date, use YYYY-MM-DD"})
			return
		}
		event.EventDate = &t
	}

	if err := h.repo.CreateEvent(c.Request.Context(), &event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}

func (h *EventHandler) GetFamilyReminders(c *gin.Context) {
	familyID := c.Param("id")
	ctx := c.Request.Context()
	today := time.Now().UTC().Truncate(24 * time.Hour)

	type Reminder struct {
		ID        string `json:"id"`
		Type      string `json:"type"`
		Label     string `json:"label"`
		PersonID  string `json:"person_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Date      string `json:"date"`
		DaysUntil int    `json:"days_until"`
	}

	var reminders []Reminder

	// Birthdays from persons.birth_date
	bdRows, err := database.DB.Query(ctx,
		`SELECT id, first_name, last_name, birth_date FROM persons WHERE family_id = $1 AND birth_date IS NOT NULL`,
		familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer bdRows.Close()
	for bdRows.Next() {
		var pid, fn, ln string
		var bd time.Time
		if err := bdRows.Scan(&pid, &fn, &ln, &bd); err != nil {
			continue
		}
		next := time.Date(today.Year(), bd.Month(), bd.Day(), 0, 0, 0, 0, time.UTC)
		if next.Before(today) {
			next = next.AddDate(1, 0, 0)
		}
		reminders = append(reminders, Reminder{
			ID: pid + "-birthday", Type: "birthday",
			Label: fn + "'s Birthday", PersonID: pid,
			FirstName: fn, LastName: ln,
			Date: next.Format("January 2"), DaysUntil: int(next.Sub(today).Hours() / 24),
		})
	}

	// Anniversaries from events table
	annRows, err := database.DB.Query(ctx, `
		SELECT e.id, e.person_id, e.description, e.event_date, p.first_name, p.last_name
		FROM events e JOIN persons p ON p.id = e.person_id
		WHERE p.family_id = $1 AND e.event_type = 'anniversary' AND e.event_date IS NOT NULL`,
		familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer annRows.Close()
	for annRows.Next() {
		var eid, pid, desc, fn, ln string
		var ed time.Time
		if err := annRows.Scan(&eid, &pid, &desc, &ed, &fn, &ln); err != nil {
			continue
		}
		next := time.Date(today.Year(), ed.Month(), ed.Day(), 0, 0, 0, 0, time.UTC)
		if next.Before(today) {
			next = next.AddDate(1, 0, 0)
		}
		label := desc
		if label == "" {
			label = fn + "'s Anniversary"
		}
		reminders = append(reminders, Reminder{
			ID: eid, Type: "anniversary",
			Label: label, PersonID: pid,
			FirstName: fn, LastName: ln,
			Date: next.Format("January 2"), DaysUntil: int(next.Sub(today).Hours() / 24),
		})
	}

	sort.Slice(reminders, func(i, j int) bool { return reminders[i].DaysUntil < reminders[j].DaysUntil })
	if reminders == nil {
		reminders = []Reminder{}
	}
	c.JSON(http.StatusOK, gin.H{"reminders": reminders})
}

func (h *EventHandler) GetEvents(c *gin.Context) {
	personID := c.Param("person_id")

	events, err := h.repo.GetEventsByPerson(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if events == nil {
		events = []models.Event{}
	}

	c.JSON(http.StatusOK, events)
}
