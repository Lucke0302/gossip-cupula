using GossipCupula.Api.Data;
using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do repositório de rastreio de gossipficação (tabela
/// <c>GossipifiedPosts</c>). Cada transformação de IA cria uma linha aqui e
/// devolve o seu Id ao cliente, que o reenvia nas próximas operações para
/// impedir a dupla gossipficação.
/// </summary>
public interface IGossipifiedPostService
{
    /// <summary>
    /// Verifica se já existe um registro com o Id informado. Usado pelo
    /// endpoint de IA para recusar a transformação de um texto temporário
    /// (<c>gossipifiedPostId</c>) que já passou pelo pipeline.
    /// </summary>
    Task<bool> ExistsAsync(Guid gossipifiedPostId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cria um novo registro de gossipficação (com um Id novo) e devolve esse
    /// Id — o token de rastreio que o frontend deve guardar.
    /// </summary>
    Task<Guid> CreateAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementação de <see cref="IGossipifiedPostService"/> apoiada no
/// <see cref="AppDbContext"/>.
/// </summary>
public class GossipifiedPostService(AppDbContext dbContext) : IGossipifiedPostService
{
    /// <inheritdoc />
    public Task<bool> ExistsAsync(Guid gossipifiedPostId, CancellationToken cancellationToken = default)
    {
        return dbContext.GossipifiedPosts
            .AsNoTracking()
            .AnyAsync(g => g.Id == gossipifiedPostId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Guid> CreateAsync(CancellationToken cancellationToken = default)
    {
        var gossipifiedPost = new GossipifiedPost
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.GossipifiedPosts.Add(gossipifiedPost);
        await dbContext.SaveChangesAsync(cancellationToken);

        return gossipifiedPost.Id;
    }
}
