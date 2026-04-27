package handlers

import (
	"net/http"
	"time"

	"shajarah-backend/internal/middleware"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo   *repository.UserRepository
	personRepo *repository.PersonRepository
}

func NewAuthHandler(userRepo *repository.UserRepository, personRepo *repository.PersonRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, personRepo: personRepo}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if existing, _ := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email); existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	email := req.Email
	person := models.Person{
		ID:         uuid.New().String(),
		Email:      &email,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Gender:     req.Gender,
		Visibility: "family_only",
		CreatedAt:  time.Now(),
	}
	if err := h.personRepo.CreatePerson(c.Request.Context(), &person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create person profile: " + err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := models.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}
	if err := h.userRepo.CreateUser(c.Request.Context(), &user); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	if err := h.userRepo.LinkUserToPerson(c.Request.Context(), uuid.New().String(), user.ID, person.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link user to person: " + err.Error()})
		return
	}

	token, err := middleware.GenerateToken(user.ID, person.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Return person_id in the response so the frontend can store it
	c.JSON(http.StatusCreated, gin.H{
		"token":     token,
		"user":      user,
		"person":    person,
		"person_id": person.ID,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Look up the person linked to this user via user_person_links
	personID, _ := h.userRepo.GetPersonIDForUser(c.Request.Context(), user.ID)

	token, err := middleware.GenerateToken(user.ID, personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"user":      user,
		"person_id": personID,
	})
}

func (h *AuthHandler) UpdatePlan(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Plan != "free" && req.Plan != "premium" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "plan must be 'free' or 'premium'"})
		return
	}

	if err := h.userRepo.UpdateUserPlan(c.Request.Context(), userID, req.Plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": req.Plan})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if err := h.userRepo.UpdateUserPassword(c.Request.Context(), userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

func (h *AuthHandler) GetPrivacy(c *gin.Context) {
	userID := c.GetString("user_id")
	personID := c.GetString("person_id")
	if personID == "" {
		personID, _ = h.userRepo.GetPersonIDForUser(c.Request.Context(), userID)
	}

	if personID == "" {
		c.JSON(http.StatusOK, gin.H{"visibility": "family_only"})
		return
	}

	person, err := h.personRepo.GetPersonByID(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"visibility": "family_only"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"visibility": person.Visibility})
}

func (h *AuthHandler) UpdatePrivacy(c *gin.Context) {
	userID := c.GetString("user_id")
	personID := c.GetString("person_id")
	if personID == "" {
		personID, _ = h.userRepo.GetPersonIDForUser(c.Request.Context(), userID)
	}

	var req struct {
		Visibility string `json:"visibility" binding:"required,oneof=private family_only public"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if personID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no profile found"})
		return
	}

	if err := h.personRepo.UpdatePersonVisibility(c.Request.Context(), personID, req.Visibility); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update privacy"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"visibility": req.Visibility})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetString("user_id")

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Resolve person via user_person_links (JWT claim may be stale after re-link)
	personID, _ := h.userRepo.GetPersonIDForUser(c.Request.Context(), userID)

	// Fall back to JWT claim if no link row exists yet
	if personID == "" {
		personID = c.GetString("person_id")
	}

	var person *models.Person
	if personID != "" {
		person, _ = h.personRepo.GetPersonByID(c.Request.Context(), personID)
	}

	c.JSON(http.StatusOK, gin.H{"user": user, "person": person, "person_id": personID})
}
