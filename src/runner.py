"""
Init script run by brython-runner for revealjs-ace-brython.
"""
import browser
import sys
import traceback

MSG_TYPE_PREFIX = 'revealjs-ace-brython.'


def send_msg(_type, value):
    """
    Send a message back to the main thread.
    """
    _type = f'{MSG_TYPE_PREFIX}{_type}'
    browser.self.send({'type': _type, 'value': value})


def handler(_type):
    """
    Decorator for defining a handler function.
    """
    def decorator(fn):
        handler.handlers[_type] = fn
        return fn
    return decorator
handler.handlers = {}


@browser.bind(browser.self, 'message')
def handle_message(evt):
    """
    Function that will handle a message from the main thread and route it to
    the appropriate handler.
    """
    if not evt.data.type.startswith(MSG_TYPE_PREFIX):
        return

    _type = evt.data.type[len(MSG_TYPE_PREFIX):]
    if _type not in handler.handlers:
        raise Exception(f'revealjs-ace-brython: no handler found for message type: {_type}')

    handler.handlers[_type](**evt.data.value)


class CustomOuputStream:
    def __init__(self, session_id, code_idx, parent_stream, msg_type_prefix):
        self.session_id = session_id
        self.code_idx = code_idx
        self.parent_stream = parent_stream
        self.msg_type_prefix = msg_type_prefix

    def write(self, data=''):
        send_msg(
            f'{self.msg_type_prefix}-write',
            {
                'session_id': self.session_id,
                'code_idx': self.code_idx,
                'data': str(data),
            },
        )
        self.parent_stream.write(data)

    def flush(self):
        send_msg(
            f'{self.msg_type_prefix}-flush',
            {
                'session_id': self.session_id,
                'code_idx': self.code_idx,
            },
        )
        self.parent_stream.flush()


@handler('exec')
def handle_exec(session_id, codes):
    g = {}
    send_msg('exec-started', {'session_id': session_id})
    saved_stdout = sys.stdout
    saved_stderr = sys.stderr
    try:
        for code_idx, code in enumerate(codes):
            send_msg(
                'exec-code-started',
                {'code_idx': code_idx, 'session_id': session_id},
            )

            sys.stdout = CustomOuputStream(
                session_id=session_id,
                code_idx=code_idx,
                parent_stream=saved_stdout,
                msg_type_prefix='exec-code-stdout',
            )

            sys.stderr = CustomOuputStream(
                session_id=session_id,
                code_idx=code_idx,
                parent_stream=saved_stderr,
                msg_type_prefix='exec-code-stderr',
            )

            try:
                exec(code, g)
            except:
                etype, evalue, tb = sys.exc_info()
                send_msg(
                    'exec-code-error',
                    {
                        'code_idx': code_idx,
                        'session_id': session_id,
                        'error': str(evalue),
                    },
                )
                traceback.print_exception(etype, evalue, tb)
                raise evalue
            else:
                send_msg(
                    'exec-code-success',
                    {'code_idx': code_idx, 'session_id': session_id},
                )
    except Exception as e:
        send_msg('exec-error', {'session_id': session_id, 'error': str(e)})
    else:
        send_msg('exec-success', {'session_id': session_id})
    finally:
        sys.stdout = saved_stdout
        sys.stderr = saved_stderr
