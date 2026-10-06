using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Galeria: achata (<c>SelectMany</c>) as imagens de todos os posts numa lista
/// única, paginada por cursor opaco.
/// <para>
/// <b>Performance:</b> a consulta projeta só o necessário (<c>Id</c>,
/// <c>Title</c>, <c>CreatedAt</c> e o array <c>ImageUrls</c>) — nada de
/// <c>Content</c> nem de agregados de comentários/votos, que a galeria não usa.
/// O achatamento e o keyset acontecem na memória, sobre essa projeção já
/// reduzida. Uma tabela própria de imagens (com dimensões e legenda) seria o
/// caminho para escalar; enquanto a única fonte é o array do post, projetar
/// enxuto é o que dá para garantir.
/// </para>
/// </summary>
public class PhotoService(AppDbContext dbContext) : IPhotoService
{
    /// <summary>Tamanho da página quando a query string não informa <c>limit</c>.</summary>
    public const int DefaultPageSize = 12;

    /// <summary>Teto de itens por página — protege de um <c>limit</c> gigante.</summary>
    public const int MaxPageSize = 60;

    /// <summary>
    /// Dimensões assumidas quando as reais não são conhecidas. O front usa
    /// <c>width</c>/<c>height</c> como atributos do <c>&lt;img&gt;</c>; um par
    /// fixo mantém a galeria previsível. Dimensões reais exigiriam capturá-las
    /// no upload (o banco só guarda a URL).
    /// </summary>
    private const int DefaultWidth = 1200;

    private const int DefaultHeight = 1200;

    /// <summary>
    /// Texto alternativo. O <c>alt</c> do front exige string não vazia e o
    /// banco não guarda descrição por imagem.
    /// </summary>
    private const string DefaultAlt = "foto publicada na cúpula";

    public async Task<Page<PhotoResponseDto>> GetPageAsync(string? cursor, int limit)
    {
        var pageSize = Math.Clamp(limit, 1, MaxPageSize);

        // Posts que têm pelo menos uma imagem, projetados só nas colunas que a
        // galeria usa. A ordenação sai do banco (mesma ordem do keyset).
        var posts = await dbContext.Posts
            .AsNoTracking()
            .Where(post => post.ImageUrls.Count > 0)
            .OrderByDescending(post => post.CreatedAt)
            .ThenByDescending(post => post.Id)
            .Select(post => new
            {
                post.Id,
                post.Title,
                post.CreatedAt,
                post.ImageUrls
            })
            .ToListAsync();

        // Flatten: (CreatedAt DESC, Id DESC, índice da imagem ASC). URLs
        // inválidas são descartadas aqui, antes do keyset — assim a contagem
        // da página e o cursor continuam coerentes.
        var photos = posts.SelectMany(post => post.ImageUrls
            .Select((url, index) => new { Url = CleanUrl(url), Index = index })
            .Where(item => item.Url is not null)
            .Select(item => new FlatPhoto(post.Id, post.Title, post.CreatedAt, item.Index, item.Url!)));

        if (OpaqueCursor.TryDecode(cursor, out OpaqueCursor.IndexedCursorValue after))
        {
            photos = photos.Where(photo => IsAfter(photo, after));
        }

        // Um item a mais que a página: se ele vier, existe página seguinte.
        var rows = photos.Take(pageSize + 1).ToList();
        var hasMore = rows.Count > pageSize;
        var page = hasMore ? rows[..pageSize] : rows;

        var items = page.Select(ToResponseDto).ToList();

        return new Page<PhotoResponseDto>
        {
            Items = items,
            NextCursor = hasMore && page.Count > 0
                ? OpaqueCursor.Encode(page[^1].CreatedAt, page[^1].PostId, page[^1].Index)
                : null
        };
    }

    /// <summary>
    /// A foto vem depois do cursor em <c>(CreatedAt DESC, Id DESC, índice ASC)</c>.
    /// </summary>
    private static bool IsAfter(FlatPhoto photo, OpaqueCursor.IndexedCursorValue after) =>
        photo.CreatedAt < after.CreatedAt ||
        (photo.CreatedAt == after.CreatedAt && photo.PostId.CompareTo(after.Id) < 0) ||
        (photo.CreatedAt == after.CreatedAt && photo.PostId == after.Id && photo.Index > after.Index);

    /// <summary>
    /// <c>caption</c> recebe o título do post: é o único contexto textual que o
    /// banco tem para a foto, e é o que a galeria exibe sob a imagem.
    /// </summary>
    private static PhotoResponseDto ToResponseDto(FlatPhoto photo) => new()
    {
        Id = $"{photo.PostId:N}{photo.Index:D2}",
        Url = photo.Url,
        Alt = DefaultAlt,
        Caption = photo.Title,
        Width = DefaultWidth,
        Height = DefaultHeight,
        PublishedAt = CoarseTime.ToHourUtc(photo.CreatedAt)
    };

    /// <summary>
    /// Limpa e valida a URL da imagem. O que está gravado já é uma URL pública
    /// do OCI, mas a limpeza cobre espaços e entradas antigas/relativas: o
    /// <c>z.string().url()</c> do front rejeita o que não for URL absoluta, e
    /// uma foto inválida derrubaria a galeria inteira.
    /// </summary>
    private static string? CleanUrl(string? url)
    {
        var trimmed = url?.Trim();

        if (string.IsNullOrEmpty(trimmed) ||
            !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return null;
        }

        return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps
            ? trimmed
            : null;
    }

    private sealed record FlatPhoto(Guid PostId, string Title, DateTime CreatedAt, int Index, string Url);
}
