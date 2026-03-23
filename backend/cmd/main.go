package main

import (
	"os"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/handlers"
	"shajarah-backend/internal/middleware"
	"shajarah-backend/internal/repository"
	"shajarah-backend/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		panic("Error loading .env file")
	}

	if err := os.MkdirAll("uploads", 0755); err != nil {
		panic("failed to create uploads directory")
	}

	database.Connect()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.Static("/uploads", "./uploads")

	personRepo := repository.NewPersonRepository()
	userRepo := repository.NewUserRepository()
	memberRepo := repository.NewMemberRepository()
	familyRepo := repository.NewFamilyRepository()
	relRepo := repository.NewRelationshipRepository()
	invitationRepo := repository.NewInvitationRepository()
	photoRepo := repository.NewPhotoRepository()
	storyRepo := repository.NewStoryRepository()
	eventRepo := repository.NewEventRepository()
	auditRepo := repository.NewAuditRepository()
	notifRepo := repository.NewNotificationRepository()

	claimRepo := repository.NewClaimRepository()
	documentRepo := repository.NewDocumentRepository()
	treeService := services.NewFamilyTreeService()
	genealogyService := services.NewGenealogyTreeService()
	inferenceSvc := services.NewInferenceService()
	kinshipSvc := services.NewKinshipService()
	kinshipHandler := handlers.NewKinshipHandler(kinshipSvc)
	gedcomSvc := services.NewGEDCOMService()

	authHandler := handlers.NewAuthHandler(userRepo, personRepo)
	r.POST("/auth/register", authHandler.Register)
	r.POST("/auth/login", authHandler.Login)

	auth := r.Group("/")
	auth.Use(middleware.RequireAuth())

	auth.GET("/auth/me", authHandler.GetMe)

	familyHandler := handlers.NewFamilyHandler(familyRepo, memberRepo, personRepo, relRepo, userRepo)
	auth.POST("/families", familyHandler.CreateFamily)
	auth.GET("/families", familyHandler.GetFamilies)
	auth.GET("/families/:id", familyHandler.GetFamily)
	auth.DELETE("/families/:id", familyHandler.DeleteFamily)
	auth.POST("/families/:id/transfer-ownership", familyHandler.TransferOwnership)
	auth.GET("/families/:id/export", familyHandler.Export)
	auth.GET("/families/:id/duplicates", familyHandler.GetDuplicates)

	personHandler := handlers.NewPersonHandler(personRepo, memberRepo, userRepo, relRepo)
	auth.POST("/persons", personHandler.CreatePerson)
	auth.GET("/persons", personHandler.GetPersons)
	auth.GET("/persons/:id", personHandler.GetPerson)
	auth.PATCH("/persons/:id", personHandler.UpdatePerson)
	auth.DELETE("/persons/:id", personHandler.DeletePerson)
	auth.POST("/persons/:id/claim", personHandler.ClaimPerson)
	auth.GET("/persons/:id/relatives", personHandler.GetRelatives)

	relHandler := handlers.NewRelationshipHandler(relRepo)
	auth.POST("/relationships", relHandler.CreateRelationship)
	auth.GET("/relationships/:person_id", relHandler.GetRelationships)
	auth.PATCH("/relationships/:id", relHandler.UpdateRelationship)
	auth.DELETE("/relationships/:id", relHandler.DeleteRelationship)
	auth.GET("/persons/:id/relationships", relHandler.GetPersonRelationshipsEnriched)

	inferenceHandler := handlers.NewInferenceHandler(inferenceSvc)
	auth.GET("/persons/:id/inferred-relatives", inferenceHandler.GetInferredRelatives)
	auth.GET("/persons/:id/relationship-to/:other", inferenceHandler.FindRelationship)

	auth.GET("/persons/:id/kinship/:other", kinshipHandler.GetKinship)
	auth.GET("/persons/:id/kinship-map", kinshipHandler.GetKinshipMap)

	invitationHandler := handlers.NewInvitationHandler(invitationRepo, memberRepo, familyRepo, userRepo, notifRepo, personRepo, relRepo, treeService, genealogyService)
	r.GET("/invitations/:token/preview", invitationHandler.GetInvitation)
	auth.POST("/families/:id/invite", invitationHandler.Invite)
	auth.GET("/families/:id/invitations", invitationHandler.ListInvitations)
	auth.POST("/invitations/:token/accept", invitationHandler.AcceptInvitation)
	auth.POST("/families/:id/join", invitationHandler.JoinFamily)

	photoHandler := handlers.NewPhotoHandler(photoRepo)
	auth.POST("/persons/:id/photos", photoHandler.UploadPhoto)
	auth.GET("/persons/:id/photos", photoHandler.GetPhotos)

	storyHandler := handlers.NewStoryHandler(storyRepo)
	auth.POST("/stories", storyHandler.CreateStory)
	auth.GET("/stories/:person_id", storyHandler.GetStories)
	auth.GET("/families/:id/stories", storyHandler.GetFamilyStories)

	eventHandler := handlers.NewEventHandler(eventRepo)
	auth.POST("/events", eventHandler.CreateEvent)
	auth.GET("/events/:person_id", eventHandler.GetEvents)
	auth.GET("/families/:id/reminders", eventHandler.GetFamilyReminders)

	treeHandler := handlers.NewTreeHandler(treeService, genealogyService)
	auth.GET("/family-tree/:family_id", treeHandler.GetFamilyTree)
	auth.GET("/families/:id/tree", treeHandler.GetGenealogyTree)
	auth.GET("/persons/:id/ancestors", treeHandler.GetAncestorTree)
	auth.GET("/persons/:id/descendants", treeHandler.GetDescendantsTree)
	auth.GET("/persons/:id/lineage", treeHandler.GetLineage)
	auth.GET("/persons/:id/children", treeHandler.GetPersonChildren)

	claimHandler := handlers.NewClaimHandler(claimRepo, personRepo, memberRepo, userRepo)
	auth.POST("/persons/:id/claim-request", claimHandler.RequestClaim)
	auth.GET("/families/:id/claims", claimHandler.ListClaims)
	auth.POST("/claims/:id/approve", claimHandler.ApproveClaim)
	auth.POST("/claims/:id/reject", claimHandler.RejectClaim)

	auth.POST("/persons/merge", personHandler.MergePersons)

	dashboardHandler := handlers.NewDashboardHandler(userRepo, personRepo, memberRepo, notifRepo)
	auth.GET("/dashboard", dashboardHandler.GetDashboard)

	activityHandler := handlers.NewActivityHandler(auditRepo, memberRepo)
	auth.GET("/families/:id/activity", activityHandler.GetActivity)

	notifHandler := handlers.NewNotificationHandler(notifRepo)
	auth.GET("/notifications", notifHandler.GetNotifications)
	auth.PATCH("/notifications/:id/read", notifHandler.MarkRead)
	auth.GET("/notifications/unread-count", notifHandler.GetUnreadCount)

	searchHandler := handlers.NewSearchHandler(personRepo)
	auth.GET("/search/persons", searchHandler.SearchPersons)

	issuesHandler := handlers.NewIssuesHandler(memberRepo)
	auth.GET("/families/:id/issues", issuesHandler.GetIssues)

	documentHandler := handlers.NewDocumentHandler(documentRepo)
	auth.POST("/persons/:id/documents", documentHandler.Upload)
	auth.GET("/persons/:id/documents", documentHandler.GetByPerson)
	auth.DELETE("/documents/:id", documentHandler.Delete)

	archiveHandler := handlers.NewArchiveHandler(memberRepo, personRepo, storyRepo, photoRepo, documentRepo)
	auth.GET("/families/:id/archive", archiveHandler.GetArchive)

	gedcomHandler := handlers.NewGEDCOMHandler(memberRepo, personRepo, relRepo, familyRepo, gedcomSvc)
	auth.POST("/families/:id/import/gedcom", gedcomHandler.ImportGEDCOM)
	auth.GET("/families/:id/export/gedcom", gedcomHandler.ExportGEDCOM)

	r.Run(":8080")
}
