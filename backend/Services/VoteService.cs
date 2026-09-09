using GossipCupula.Api.Data;
using GossipCupula.Api.Hubs;
using GossipCupula.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Implementa o toggle de like/dislike em posts. Um usuário só pode ter um
/// voto por post (chave composta PostId + UserId). Após cada alteração,
/// recalcula os totais e notifica os clientes via SignalR.
/// </summary>
public class VoteService(
    AppDbContext dbContext,
    IHubContext<GossipHub> hubContext) : IVoteService
{
    public async Task<(int Likes, int Dislikes)> ToggleVoteAsync(Guid postId, Guid userId, int voteType)
    {
        if (voteType != (int)VoteType.Like && voteType != (int)VoteType.Dislike)
        {
            throw new ArgumentOutOfRangeException(nameof(voteType), "voteType deve ser 1 (Like) ou -1 (Dislike).");
        }

        var targetVote = (VoteType)voteType;

        if (!await dbContext.Posts.AnyAsync(p => p.Id == postId))
        {
            throw new KeyNotFoundException("Post não encontrado.");
        }

        // Busca o voto pela chave composta (PostId, UserId).
        var existingVote = await dbContext.PostVotes
            .FirstOrDefaultAsync(v => v.PostId == postId && v.UserId == userId);

        if (existingVote is null)
        {
            // Não existe voto: cria um novo registro.
            dbContext.PostVotes.Add(new PostVote
            {
                PostId = postId,
                UserId = userId,
                Vote = targetVote,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (existingVote.Vote == targetVote)
        {
            // Já votou com o mesmo tipo: remove o voto (ação de "tirar o like").
            dbContext.PostVotes.Remove(existingVote);
        }
        else
        {
            // Voto com tipo diferente: atualiza para o novo valor (troca like por dislike).
            existingVote.Vote = targetVote;
        }

        await dbContext.SaveChangesAsync();

        // Calcula os novos totais do post.
        var likes = await dbContext.PostVotes.CountAsync(v => v.PostId == postId && v.Vote == VoteType.Like);
        var dislikes = await dbContext.PostVotes.CountAsync(v => v.PostId == postId && v.Vote == VoteType.Dislike);

        // Notifica todos os clientes conectados em tempo real (SignalR).
        await hubContext.Clients.All.SendAsync(
            "UpdateVoteCount",
            new { PostId = postId, Likes = likes, Dislikes = dislikes });

        return (likes, dislikes);
    }
}
