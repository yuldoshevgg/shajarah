package handlers

import (
	"net/http"
	"time"

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
