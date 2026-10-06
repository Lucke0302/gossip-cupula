using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Comments;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Criação e listagem paginada de comentários de um post.
/// <para>
/// Comentários são 100% anônimos: nada do usuário autenticado (Id, username,
/// e-mail) é gravado — só texto, post e instante de criação.
/// </para>
/// </summary>
public class CommentService(AppDbContext dbContext) : ICommentService
{
    /// <summary>Tamanho da página quando a query string não informa <c>limit</c>.</summary>
    public const int DefaultPageSize = 20;

    /// <summary>Teto de itens por página — protege o banco de um <c>limit</c> gigante.</summary>
    public const int MaxPageSize = 100;

    public async Task<CommentResponse?> CreateAsync(Guid postId, CreateCommentRequest request)
    {
        // Regra: só comenta quem comenta em post que existe (404 na controller).
        var postExists = await dbContext.Posts.AnyAsync(post => post.Id == postId);
        if (!postExists)
        {
            return null;
        }

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            Text = request.Text.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        // Nenhum dado do usuário do token entra aqui, de propósito.
        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync();

        return ToResponse(comment);
    }

    public async Task<Page<CommentResponse>> GetPageAsync(Guid postId, string? cursor, int limit)
    {
        var pageSize = Math.Clamp(limit, 1, MaxPageSize);

        var query = dbContext.Comments
            .AsNoTracking()
            .Where(comment => comment.PostId == postId);

        // Keyset (e não offset): a partir do último item entregue, só o que
        // vem DEPOIS dele em (CreatedAt DESC, Id DESC). O Id desempata
        // comentários gravados no mesmo instante. O cursor é o mesmo helper
        // opaco usado por posts, galeria e links.
        if (OpaqueCursor.TryDecode(cursor, out OpaqueCursor.CursorValue after))
        {
            query = query.Where(comment =>
                comment.CreatedAt < after.CreatedAt ||
                (comment.CreatedAt == after.CreatedAt && comment.Id.CompareTo(after.Id) < 0));
        }

        // Um item a mais que a página: se ele vier, existe página seguinte.
        var rows = await query
            .OrderByDescending(comment => comment.CreatedAt)
            .ThenByDescending(comment => comment.Id)
            .Take(pageSize + 1)
            .Select(comment => new { comment.Id, comment.Text, comment.CreatedAt })
            .ToListAsync();

        var hasMore = rows.Count > pageSize;
        var page = hasMore ? rows[..pageSize] : rows;

        var items = page
            .Select(row => new CommentResponse
            {
                Id = row.Id,
                Text = row.Text,
                PublishedAt = CoarseTime.ToHourUtc(row.CreatedAt)
            })
            .ToList();

        return new Page<CommentResponse>
        {
            Items = items,
            NextCursor = hasMore && page.Count > 0
                ? OpaqueCursor.Encode(page[^1].CreatedAt, page[^1].Id)
                : null
        };
    }

    /// <summary>
    /// Quantidade de comentários do post.
    /// <para>
    /// É um <c>COUNT</c> no banco: nenhum comentário é materializado, nenhum
    /// campo além do necessário é lido. Um post inexistente devolve 0, mesmo
    /// comportamento do <c>GET</c> da listagem (que não valida a existência do
    /// post, apenas filtra por <c>PostId</c>).
    /// </para>
    /// </summary>
    public async Task<int> CountAsync(Guid postId) =>
        await dbContext.Comments
            .AsNoTracking()
            .CountAsync(comment => comment.PostId == postId);

    private static CommentResponse ToResponse(Comment comment) => new()
    {
        Id = comment.Id,
        Text = comment.Text,
        PublishedAt = CoarseTime.ToHourUtc(comment.CreatedAt)
    };
}
