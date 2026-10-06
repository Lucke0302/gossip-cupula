using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato da página de links: URLs externas extraídas do texto dos posts,
/// achatadas numa lista única e paginadas por cursor opaco.
/// </summary>
public interface ILinkService
{
    /// <summary>
    /// Uma página de links, dos posts mais recentes para os mais antigos e,
    /// dentro de um post, na ordem em que aparecem no texto, paginada por
    /// cursor opaco.
    /// </summary>
    Task<Page<LinkResponseDto>> GetPageAsync(string? cursor, int limit);
}
