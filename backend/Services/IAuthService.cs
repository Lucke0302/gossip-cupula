using GossipCupula.Api.DTOs.Admin;
using GossipCupula.Api.DTOs.Auth;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do serviço de autenticação (cadastro, confirmação de e-mail,
/// aprovação de admin, login, emissão/refresh de JWT e refresh tokens).
/// </summary>
public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);

    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);

    /// <summary>
    /// Marca o e-mail do usuário como confirmado. Retorna false se não existir.
    /// </summary>
    Task<bool> ConfirmEmailAsync(string email);

    /// <summary>
    /// Lista os usuários para o painel de administração (apenas Admin).
    /// As contas ainda não aprovadas vêm primeiro, pois são as que exigem
    /// decisão; dentro de cada grupo, as mais recentes na frente.
    /// </summary>
    Task<IReadOnlyList<UserSummaryDto>> ListUsersAsync();

    /// <summary>
    /// Aprova a conta de um usuário (apenas Admin). Retorna false se não existir.
    /// </summary>
    Task<bool> ApproveUserAsync(Guid userId);

    /// <summary>
    /// Revoga a aprovação de um usuário (apenas Admin): impede novos logins e
    /// anula o refresh token/sessão ativa. Retorna false se não existir.
    /// </summary>
    Task<bool> RevokeUserAsync(Guid userId);

    /// <summary>
    /// Remove permanentemente um usuário (apenas Admin). Os PostVotes dele são
    /// apagados em cascata; posts (100% anônimos) permanecem intactos.
    /// </summary>
    Task<bool> DeleteUserAsync(Guid userId);

    /// <summary>
    /// Valida o refresh token e retorna um novo par (JWT + Refresh Token).
    /// </summary>
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto refreshTokenDto);
}
