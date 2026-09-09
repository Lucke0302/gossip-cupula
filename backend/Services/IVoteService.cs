using GossipCupula.Api.DTOs.Votes;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do serviço de votação (like/dislike) com notificação em tempo real.
/// </summary>
public interface IVoteService
{
    Task<(int Likes, int Dislikes)> ToggleVoteAsync(Guid postId, Guid userId, int voteType);
}
