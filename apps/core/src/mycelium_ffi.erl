-module(mycelium_ffi).
-export([is_windows/0, open_port/2, send_line/2, spawn_port_reader/2]).

is_windows() ->
    case os:type() of
        {win32, _} -> true;
        _ -> false
    end.

open_port(BinaryPath, Args) ->
    BinaryPathStr = unicode:characters_to_list(BinaryPath),
    ArgsStr = [unicode:characters_to_list(A) || A <- Args],
    erlang:open_port(
        {spawn_executable, BinaryPathStr},
        [{args, ArgsStr}, {line, 65536}, binary, exit_status, use_stdio, hide]
    ).

send_line(Port, Line) ->
    Bin = unicode:characters_to_binary([Line, $\n]),
    true = erlang:port_command(Port, Bin),
    nil.

spawn_port_reader(Port, Subject) ->
    Parent = self(),
    Reader = spawn(fun() ->
        receive port_owned -> ok end,
        reader_loop(Port, Subject, <<>>)
    end),
    erlang:port_connect(Port, Reader),
    erlang:unlink(Port),
    Reader ! port_owned,
    nil.

reader_loop(Port, Subject, Buffer) ->
    receive
        {Port, {data, {eol, Line}}} ->
            FullLine = <<Buffer/binary, Line/binary>>,
            send_to_subject(Subject, {port_line, FullLine}),
            reader_loop(Port, Subject, <<>>);
        {Port, {data, {noeol, Chunk}}} ->
            reader_loop(Port, Subject, <<Buffer/binary, Chunk/binary>>);
        {Port, {exit_status, _}} ->
            send_to_subject(Subject, port_closed_msg),
            ok;
        _Other ->
            reader_loop(Port, Subject, Buffer)
    end.

send_to_subject({subject, Pid, Tag}, Message) ->
    erlang:send(Pid, {Tag, Message});
send_to_subject({named_subject, Name}, Message) ->
    case erlang:whereis(Name) of
        undefined -> ok;
        Pid -> erlang:send(Pid, {Name, Message})
    end.
