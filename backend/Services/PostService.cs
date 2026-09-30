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
    IStorageService storageService,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<PostService> logger,
    IHubContext<GossipHub> hubContext) : IPostService
{
    /// <summary>Tamanho máximo do título, alinhado à coluna <c>Posts.Title</c>.</summary>
    private const int MaxTitleLength = 200;

    private static readonly Expression<Func<Post, PostResponseDto>> ToResponseDto = post => new PostResponseDto
    {
        Id = post.Id,
        Title = post.Title,
        Content = post.Content,
        OwnerUsername = "Gossip Girl",
        CreatedAt = post.CreatedAt,
        EditedAt = post.EditedAt,
        EditedBy = post.EditedBy,
        // Array "text[]" do próprio post: vem na mesma linha, sem join.
        ImageUrls = post.ImageUrls,
        // COUNT correlacionado no MESMO SELECT: uma query para a lista
        // inteira, não uma query por post (N+1).
        CommentCount = post.Comments.Count(),
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

    /// <summary>
    /// Publica um post sem imagens (contrato JSON: <c>title</c> + <c>content</c>).
    /// </summary>
    public Task<PostResponseDto> CreateAsync(CreatePostDto createPostDto) =>
        CreateAsync(createPostDto.Title, createPostDto.Content, []);

    /// <summary>
    /// Publica um post vindo de <c>multipart/form-data</c> (texto + imagens).
    /// <para>
    /// Os uploads acontecem em paralelo (<c>Task.WhenAll</c>): cinco fotos
    /// custam o tempo da mais lenta, não a soma das cinco. Se qualquer upload
    /// falhar, a exceção sobe e <b>nada</b> é gravado — post com URL quebrada
    /// seria pior que post não publicado.
    /// </para>
    /// </summary>
    public async Task<PostResponseDto> CreateAsync(CreatePostFormRequest formRequest)
    {
        var images = formRequest.Images;
        var imageUrls = images is null || images.Count == 0
            ? []
            : (await Task.WhenAll(images.Select(image => storageService.UploadImageAsync(image)))).ToList();

        return await CreateAsync(ResolveTitle(formRequest.Title, formRequest.Text), formRequest.Text, imageUrls);
    }

    /// <summary>
    /// Grava o post e dispara os efeitos colaterais (webhook do Bostossauro e
    /// evento SignalR). Ponto único de escrita: os dois contratos de entrada
    /// (JSON e multipart) convergem para cá.
    /// </summary>
    private async Task<PostResponseDto> CreateAsync(string title, string content, List<string> imageUrls)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = title.Trim(),
            Content = content.Trim(),
            ImageUrls = imageUrls,
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
    /// Título do post. O formulário novo manda só o texto, então quando o
    /// título não vem (ou vem só com espaços) ele é derivado da primeira
    /// linha do texto — a coluna <c>Posts.Title</c> é NOT NULL e não vale
    /// gravar manchete vazia. O corte em 200 caracteres respeita o tamanho
    /// da coluna.
    /// </summary>
    private static string ResolveTitle(string? title, string content)
    {
        if (!string.IsNullOrWhiteSpace(title))
        {
            return title.Trim();
        }

        var firstLine = content
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? content.Trim();

        return firstLine.Length <= MaxTitleLength ? firstLine : firstLine[..MaxTitleLength];
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
