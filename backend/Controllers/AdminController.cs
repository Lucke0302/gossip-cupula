using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Endpoints administrativos. Todos exigem autenticação com role "Admin".
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAuthService _authService;

    public AdminController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Aprova a conta de um usuário, liberando o login (passo 2 da validação).
    /// </summary>
    [HttpPost("users/{id:guid}/approve")]
    public async Task<IActionResult> ApproveUser(Guid id)
    {
        var approved = await _authService.ApproveUserAsync(id);
        return approved ? NoContent() : NotFound();
    }

    /// <summary>
    /// Revoga a aprovação: impede novos logins e derruba a sessão ativa
    /// (RefreshToken e RefreshTokenExpiryTime são anulados).
    /// </summary>
    [HttpPost("users/{id:guid}/revoke")]
    public async Task<IActionResult> RevokeUser(Guid id)
    {
        var revoked = await _authService.RevokeUserAsync(id);
        return revoked ? NoContent() : NotFound();
    }

    /// <summary>
    /// Remove permanentemente um usuário do banco. Os PostVotes dele são
    /// apagados em cascata; os posts (100% anônimos) permanecem intactos.
    /// </summary>
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var deleted = await _authService.DeleteUserAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
