-module(binary_to_integer_safe).
-export([parse/1]).

parse(S) ->
    Bin = unicode:characters_to_binary(S),
    Trimmed = string:trim(Bin),
    case Trimmed of
        <<>> -> {error, nil};
        _ ->
            try
                {ok, binary_to_integer(Trimmed)}
            catch
                error:badarg -> {error, nil}
            end
    end.
