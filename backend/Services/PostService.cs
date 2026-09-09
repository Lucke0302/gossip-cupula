using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Posts;
using GossipCupula.Api.Hubs;
using GossipCupula.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Implementa o CRUD de posts 100% anônimos ("Gossip Girl"), o controle de
/// acesso (somente Admin pode editar/excluir) e a notificação do webhook do
/// bot Bostossauro após a criação de um post.
/// </summary>
public class PostService(
    AppDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<PostService> logger,
    IHubContext<GossipHub> hubContext) : IPostService
{
    private static readonly Expression<Func<Post, PostResponseDto>> ToResponseDto = post => new PostResponseDto
    {
        Id = post.Id,
        Title = post.Title,
        Content = post.Content,
        OwnerUsername = "Gossip Girl",
        CreatedAt = post.CreatedAt,
        EditedAt = post.EditedAt,
        EditedBy = post.EditedBy,
        LikesCount = post.Votes.Count(vote => vote.Vote == VoteType.Like),
        DislikesCount = post.Votes.Count(vote => vote.Vote == VoteType.Dislike)
    };

    public async Task<List<PostResponseDto>> GetAllAsync()
    {
        return await dbContext.Posts
            .AsNoTracking()
            .OrderByDescending(post => post.CreatedAt)
            .Select(ToResponseDto)
            .ToListAsync();
    }

    public async Task<PostResponseDto?> GetByIdAsync(Guid id)
    {
        return await dbContext.Posts
            .AsNoTracking()
            .Where(post => post.Id == id)
            .Select(ToResponseDto)
            .FirstOrDefaultAsync();
    }

    public async Task<PostResponseDto> CreateAsync(CreatePostDto createPostDto)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = createPostDto.Title.Trim(),
            Content = createPostDto.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Posts.Add(post);
        await dbContext.SaveChangesAsync();

        // Regra de integração (.clinerules): dispara o webhook do bot Bostossauro
        // de forma fire-and-forget (não-bloqueante) — a falha não afeta o post criado.
        NotifyBostossauroWebhook();

        var postResponseDto = await GetByIdAsync(post.Id)
            ?? throw new InvalidOperationException("Falha ao recuperar o post recém-criado.");

        // Notifica todos os clientes conectados em tempo real (SignalR).
        await hubContext.Clients.All.SendAsync("ReceiveNewGossip", postResponseDto);

        return postResponseDto;
    }

    public async Task<PostResponseDto?> UpdateAsync(
        Guid postId,
        UpdatePostDto updatePostDto,
        Guid currentUserId,
        string currentUserRole)
    {
        var post = await dbContext.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null)
        {
            return null;
        }

        EnsureCanManagePost(currentUserRole);

        post.Content = updatePostDto.Content.Trim();
        post.EditedAt = DateTime.UtcNow;
        post.EditedBy = currentUserId;

        await dbContext.SaveChangesAsync();

        return await GetByIdAsync(postId);
    }

    public async Task<bool> DeleteAsync(Guid postId, string currentUserRole)
    {
        var post = await dbContext.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null)
        {
            return false;
        }

        EnsureCanManagePost(currentUserRole);

        dbContext.Posts.Remove(post);
        await dbContext.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Controle de acesso (.clinerules): posts são 100% anônimos e não possuem
    /// dono — apenas usuários com a role "Admin" podem editar ou excluir.
    /// </summary>
    private static void EnsureCanManagePost(string currentUserRole)
    {
        var isAdmin = string.Equals(currentUserRole, "Admin", StringComparison.OrdinalIgnoreCase);

        if (!isAdmin)
        {
            throw new UnauthorizedAccessException(
                "Apenas usuários com a role \"Admin\" podem editar ou excluir posts.");
        }
    }

    /// <summary>
    /// Envia um POST fire-and-forget para o webhook do bot Bostossauro com o
    /// payload <c>{"message": "xoxo"}</c>. Erros são apenas registrados em log.
    /// </summary>
    private void NotifyBostossauroWebhook()
    {
        _ = Task.Run(async () =>
        {
            try
            {
                var webhookUrl = configuration["BotWebhookUrl"]
                    ?? throw new InvalidOperationException("A configuração 'BotWebhookUrl' é obrigatória.");

                var payload = JsonSerializer.Serialize(new { message = "xoxo" });
                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var client = httpClientFactory.CreateClient("BostossauroWebhook");

                await client.PostAsync(webhookUrl, content);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Falha ao notificar o webhook do Bostossauro após a criação de um post.");
            }
        });
    }
}
