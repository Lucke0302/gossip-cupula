using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Post> Posts => Set<Post>();

    public DbSet<PostVote> PostVotes => Set<PostVote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Todos os timestamps são gravados como UTC. O Npgsql exige DateTime
        // com Kind=Utc em colunas "timestamp with time zone"; por isso os
        // valores devem ser atribuídos sempre com DateTime.UtcNow.
        const string timestampWithTimeZone = "timestamp with time zone";

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Username)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(u => u.Email)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.Property(u => u.PasswordHash)
                  .IsRequired()
                  .HasMaxLength(500);

            entity.Property(u => u.Role)
                  .IsRequired()
                  .HasMaxLength(20);

            entity.Property(u => u.IsEmailConfirmed)
                  .HasDefaultValue(false);

            entity.Property(u => u.IsApprovedByAdmin)
                  .HasDefaultValue(false);

            entity.Property(u => u.RefreshToken)
                  .HasMaxLength(256);

            entity.Property(u => u.RefreshTokenExpiryTime)
                  .HasColumnType(timestampWithTimeZone);

            entity.Property(u => u.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Post>(entity =>
        {
            entity.ToTable("Posts");
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Title)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(p => p.Content)
                  .IsRequired();

            entity.Property(p => p.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            entity.Property(p => p.EditedAt)
                  .HasColumnType(timestampWithTimeZone);
            // Posts são 100% anônimos: não existe mais FK para User (Owner).
        });

        modelBuilder.Entity<PostVote>(entity =>
        {
            entity.ToTable("PostVotes");

            // Chave composta: um usuário só pode ter UM voto por post
            entity.HasKey(pv => new { pv.PostId, pv.UserId });

            entity.Property(pv => pv.Vote)
                  .IsRequired();

            entity.Property(pv => pv.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            // FK: PostVote -> Post
            entity.HasOne(pv => pv.Post)
                  .WithMany(p => p.Votes)
                  .HasForeignKey(pv => pv.PostId)
                  .OnDelete(DeleteBehavior.Cascade);

            // FK: PostVote -> User
            entity.HasOne(pv => pv.User)
                  .WithMany(u => u.Votes)
                  .HasForeignKey(pv => pv.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
