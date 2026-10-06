using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato da galeria: imagens dos posts achatadas numa lista única e
/// paginadas por cursor opaco.
/// </summary>
public interface IPhotoService
{
    /// <summary>
    /// Uma página de fotos, das mais recentes para as mais antigas e, dentro
    /// de um post, na ordem das imagens, paginada por cursor opaco.
    /// </summary>
    Task<Page<PhotoResponseDto>> GetPageAsync(string? cursor, int limit);
}
