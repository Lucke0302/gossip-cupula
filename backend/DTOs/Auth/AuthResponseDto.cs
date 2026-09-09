namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO de resposta retornado após um Register ou Login bem-sucedido.
/// </summary>
public class AuthResponseDto
{
    /// <summary>
    /// Token JWT que deve ser enviado no header "Authorization: Bearer {Token}".
    /// </summary>
    public string Token { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Refresh token usado em POST /api/auth/refresh para obter um novo par
    /// de tokens sem reenviar a senha.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;
}
