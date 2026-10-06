using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Post> Posts => Set<Post>();

    public DbSet<PostVote> PostVotes => Set<PostVote>();

    public DbSet<Comment> Comments => Set<Comment>();

    public DbSet<Event> Events => Set<Event>();

    public DbSet<EventPresence> EventPresences => Set<EventPresence>();

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

            // Imagens do post. O Npgsql mapeia List<string> para o array
            // nativo "text[]" do PostgreSQL — sem tabela auxiliar.
            //
            // NOT NULL + DEFAULT '{}': a migração é aditiva e não pode quebrar
            // quando a tabela já tem posts (ALTER TABLE ... ADD "ImageUrls"
            // text[] NOT NULL sem default falharia em tabela populada).
            entity.Property(p => p.ImageUrls)
                  .HasColumnType("text[]")
                  .IsRequired()
                  .HasDefaultValueSql("ARRAY[]::text[]");

            // Flag de gossipficação (IA). NOT NULL + DEFAULT false: a migração é
            // aditiva e não pode quebrar quando a tabela já tem posts.
            entity.Property(p => p.IsGossipfyed)
                  .HasDefaultValue(false);

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

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.ToTable("Comments");
            entity.HasKey(c => c.Id);

            entity.Property(c => c.Text)
                  .IsRequired()
                  .HasMaxLength(500);

            entity.Property(c => c.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            // Comentários são 100% anônimos: NÃO existe FK para User
            // (nenhum UserId/AuthorId/Owner é gravado).
            //
            // FK: Comment -> Post (1:N). Excluir o post exclui os comentários.
            entity.HasOne(c => c.Post)
                  .WithMany(p => p.Comments)
                  .HasForeignKey(c => c.PostId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Sustenta a listagem paginada: WHERE PostId = @id
            // ORDER BY CreatedAt DESC, Id DESC.
            entity.HasIndex(c => new { c.PostId, c.CreatedAt, c.Id });
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("Events");
            entity.HasKey(e => e.Id);

            // Grão = dia. O Npgsql mapeia DateOnly nativamente para "date"
            // (coluna sem hora), e TimeOnly? para "time without time zone".
            // São os tipos que o contrato pede: `date` YYYY-MM-DD e `time`
            // "HH:mm" ou NULL ("a confirmar").
            entity.Property(e => e.Date)
                  .HasColumnType("date");

            entity.Property(e => e.Time)
                  .HasColumnType("time without time zone");

            entity.Property(e => e.Title)
                  .IsRequired()
                  .HasMaxLength(120);

            entity.Property(e => e.Place)
                  .IsRequired()
                  .HasMaxLength(120);

            entity.Property(e => e.Description)
                  .IsRequired()
                  .HasMaxLength(500);

            // Hexadecimal "#RRGGBB": uma das cinco cores do design
            // (EVENT_COLORS no front). A lista fechada é validada no DTO de
            // entrada; aqui só o tamanho, para a coluna não virar varchar(1).
            entity.Property(e => e.Color)
                  .IsRequired()
                  .HasMaxLength(7);

            // Assinatura OPCIONAL: NULL é o padrão, e é o que fica gravado
            // quando a pessoa não marca "assinar". Não é "gravar e esconder" —
            // o nome simplesmente não existe na linha.
            entity.Property(e => e.AuthorName)
                  .HasMaxLength(50);

            entity.Property(e => e.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            // `goingCount` e `isGoing` NÃO são colunas: saem das presenças
            // (`e.Presences.Count()` e `e.Presences.Any(p => p.UserId == eu)`).
            // A relação é configurada em EventPresence.

            // Sustenta a listagem por mês: WHERE Date >= @start AND Date < @end
            // ORDER BY Date.
            entity.HasIndex(e => e.Date);
        });

        modelBuilder.Entity<EventPresence>(entity =>
        {
            entity.ToTable("EventPresences");

            // Chave composta: um usuário confirma presença UMA vez por evento
            // (mesmo padrão de PostVotes). É a garantia de integridade no banco
            // contra confirmações repetidas — a checagem na aplicação sozinha
            // perderia a corrida entre dois requests simultâneos.
            entity.HasKey(p => new { p.EventId, p.UserId });

            entity.Property(p => p.CreatedAt)
                  .HasColumnType(timestampWithTimeZone);

            // FK: EventPresence -> Event (excluir o evento apaga as presenças).
            entity.HasOne(p => p.Event)
                  .WithMany(e => e.Presences)
                  .HasForeignKey(p => p.EventId)
                  .OnDelete(DeleteBehavior.Cascade);

            // FK: EventPresence -> User, sem navegação inversa em User de
            // propósito: nenhuma leitura precisa carregar "em quais eventos eu
            // confirmei". A FK em cascata mantém o DELETE de usuário do Admin
            // funcionando — as presenças dele saem junto, e o evento permanece.
            entity.HasOne(p => p.User)
                  .WithMany()
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
