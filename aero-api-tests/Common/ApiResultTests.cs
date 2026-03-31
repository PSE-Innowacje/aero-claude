using LotyApi.Common;

namespace LotyApi.Tests.Common;

public class ApiResultTests
{
    [Fact]
    public void Ok_WithData_ReturnsSuccessTrue()
    {
        var result = ApiResult<string>.Ok("hello");

        Assert.True(result.Success);
        Assert.Equal("hello", result.Data);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void Fail_WithErrorMessages_ReturnsSuccessFalse()
    {
        var result = ApiResult<string>.Fail("Error one", "Error two");

        Assert.False(result.Success);
        Assert.Null(result.Data);
        Assert.Equal(2, result.Errors.Count);
        Assert.Contains("Error one", result.Errors);
        Assert.Contains("Error two", result.Errors);
    }

    [Fact]
    public void Fail_WithEnumerable_ReturnsAllErrors()
    {
        var errors = new[] { "e1", "e2", "e3" };
        var result = ApiResult<int>.Fail(errors);

        Assert.False(result.Success);
        Assert.Equal(3, result.Errors.Count);
    }

    [Fact]
    public void NonGenericOk_ReturnsSuccessTrue()
    {
        var result = ApiResult.Ok();

        Assert.True(result.Success);
        Assert.Null(result.Data);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void NonGenericFail_ReturnsSuccessFalse()
    {
        var result = ApiResult.Fail("Something went wrong");

        Assert.False(result.Success);
        Assert.Single(result.Errors);
        Assert.Equal("Something went wrong", result.Errors[0]);
    }

    [Fact]
    public void Ok_WithNullData_IsAllowed()
    {
        var result = ApiResult<string?>.Ok(null);

        Assert.True(result.Success);
        Assert.Null(result.Data);
    }

    [Fact]
    public void Fail_WithNoErrors_ReturnsEmptyErrors()
    {
        var result = ApiResult<string>.Fail();

        Assert.False(result.Success);
        Assert.Empty(result.Errors);
    }
}

public class PagedRequestTests
{
    [Fact]
    public void DefaultValues_AreCorrect()
    {
        var req = new PagedRequest();

        Assert.Equal(1, req.Strona);
        Assert.Equal(20, req.RozmiarStrony);
    }

    [Fact]
    public void Pominij_IsCalculatedCorrectly()
    {
        var req = new PagedRequest(3, 20);

        Assert.Equal(40, req.Pominij); // (3-1) * 20
    }

    [Fact]
    public void Pominij_FirstPage_IsZero()
    {
        var req = new PagedRequest(1, 10);

        Assert.Equal(0, req.Pominij);
    }

    [Theory]
    [InlineData(-5, 1)]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(5, 5)]
    public void Strona_IsClampedToMinimumOne(int input, int expected)
    {
        var req = new PagedRequest(input, 20);

        Assert.Equal(expected, req.Strona);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(50, 50)]
    [InlineData(100, 100)]
    [InlineData(101, 100)]
    [InlineData(200, 100)]
    public void RozmiarStrony_IsClampedBetweenOneAndHundred(int input, int expected)
    {
        var req = new PagedRequest(1, input);

        Assert.Equal(expected, req.RozmiarStrony);
    }
}

public class PagedResultTests
{
    [Fact]
    public void LacznaLiczbaStron_IsCalculatedCorrectly()
    {
        var result = new PagedResult<int>
        {
            Items = [1, 2, 3],
            Strona = 1,
            RozmiarStrony = 10,
            LacznaLiczba = 25
        };

        Assert.Equal(3, result.LacznaLiczbaStron); // ceil(25/10) = 3
    }

    [Fact]
    public void LacznaLiczbaStron_ExactlyDivisible_IsCorrect()
    {
        var result = new PagedResult<int>
        {
            Items = [],
            Strona = 1,
            RozmiarStrony = 10,
            LacznaLiczba = 20
        };

        Assert.Equal(2, result.LacznaLiczbaStron); // 20/10 = 2
    }

    [Fact]
    public void MaPoprzednia_OnFirstPage_IsFalse()
    {
        var result = new PagedResult<string>
        {
            Items = [],
            Strona = 1,
            RozmiarStrony = 10,
            LacznaLiczba = 50
        };

        Assert.False(result.MaPoprzednia);
    }

    [Fact]
    public void MaPoprzednia_OnSecondPage_IsTrue()
    {
        var result = new PagedResult<string>
        {
            Items = [],
            Strona = 2,
            RozmiarStrony = 10,
            LacznaLiczba = 50
        };

        Assert.True(result.MaPoprzednia);
    }

    [Fact]
    public void MaNastepna_OnLastPage_IsFalse()
    {
        var result = new PagedResult<string>
        {
            Items = [],
            Strona = 5,
            RozmiarStrony = 10,
            LacznaLiczba = 50
        };

        Assert.False(result.MaNastepna);
    }

    [Fact]
    public void MaNastepna_NotOnLastPage_IsTrue()
    {
        var result = new PagedResult<string>
        {
            Items = [],
            Strona = 2,
            RozmiarStrony = 10,
            LacznaLiczba = 50
        };

        Assert.True(result.MaNastepna);
    }

    [Fact]
    public void LacznaLiczbaStron_WhenEmpty_IsZero()
    {
        var result = new PagedResult<int>
        {
            Items = [],
            Strona = 1,
            RozmiarStrony = 10,
            LacznaLiczba = 0
        };

        Assert.Equal(0, result.LacznaLiczbaStron);
    }
}
